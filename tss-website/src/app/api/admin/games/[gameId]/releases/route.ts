import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { getManifestPath, ensureGameBuildsBucket } from "@/lib/supabase-storage";
import { isSafeRelativePath, isValidPlatform, isValidVersion } from "@/lib/game-manifest";
import type { GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// GET /api/admin/games/[gameId]/releases — release history for a game (all statuses)
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  try {
    await createClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }
  // Service role: RLS on game_releases only exposes status='published' rows
  // to the authenticated (cookie) client — admin needs to see draft/archived
  // too, and the requireAdmin() check above is what actually authorizes this.
  const supabase = createServiceClient();

  try {
    const { gameId } = await params;
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      return NextResponse.json({ error: "Nieprawidłowe ID gry" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("game_releases")
      .select("*")
      .eq("game_id", gameIdNum)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API] Admin game releases GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data as GameRelease[] });
  } catch (error) {
    console.error("[API] Admin game releases GET unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}

// POST /api/admin/games/[gameId]/releases — create a new draft release.
// Row is created (and gets a stable id) before any file uploads start, so
// an interrupted admin upload session can resume against the same release.
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }
  // Service role for the actual game_releases write — see GET handler above
  // for why (RLS only grants authenticated SELECT on published rows).
  const serviceClient = createServiceClient();

  try {
    const { gameId } = await params;
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      return NextResponse.json({ error: "Nieprawidłowe ID gry" }, { status: 400 });
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameIdNum)
      .maybeSingle();
    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }
    if (!game) {
      return NextResponse.json({ error: "Gra nie została znaleziona" }, { status: 404 });
    }

    const body = await request.json();
    const version: string = body?.version;
    const platform: string = body?.platform || "windows";
    const executablePath: string = body?.executable_path;
    const releaseNotes: string | undefined = body?.release_notes;

    if (!isValidVersion(version)) {
      return NextResponse.json({ error: "Nieprawidłowa wersja (dozwolone: litery, cyfry, kropki, myślniki, do 50 znaków)" }, { status: 400 });
    }
    if (!isValidPlatform(platform)) {
      return NextResponse.json({ error: "Nieprawidłowa platforma" }, { status: 400 });
    }
    if (!isSafeRelativePath(executablePath)) {
      return NextResponse.json({ error: "Nieprawidłowa ścieżka pliku wykonywalnego" }, { status: 400 });
    }

    const bucketResult = await ensureGameBuildsBucket();
    if (bucketResult.error) {
      return NextResponse.json({ error: `Nie udało się przygotować magazynu plików: ${bucketResult.error}` }, { status: 500 });
    }

    const { data, error } = await serviceClient
      .from("game_releases")
      .insert({
        game_id: gameIdNum,
        version,
        platform,
        status: "draft",
        executable_path: executablePath,
        manifest_path: getManifestPath(gameIdNum, platform, version),
        release_notes: releaseNotes || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Wydanie o tej wersji i platformie już istnieje" }, { status: 409 });
      }
      console.error("[API] Admin game releases POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data as GameRelease, message: "Utworzono wydanie roboczej" });
  } catch (error) {
    console.error("[API] Admin game releases POST unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
