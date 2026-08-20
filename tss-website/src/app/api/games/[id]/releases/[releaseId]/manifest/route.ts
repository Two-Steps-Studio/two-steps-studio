import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import type { GameManifest, GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ id: string; releaseId: string }>;
}

// GET /api/games/[id]/releases/[releaseId]/manifest
// Returns the release's manifest.json content plus executable_path — small
// JSON, safe to proxy through Next (unlike the actual build files).
export async function GET(request: Request, { params }: RouteParams) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const { id, releaseId } = await params;
    const gameId = parseInt(id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Nieprawidłowe ID gry" }, { status: 400 });
    }

    const { data: release, error: releaseError } = await supabase
      .from("game_releases")
      .select("*")
      .eq("id", releaseId)
      .eq("game_id", gameId)
      .eq("status", "published")
      .maybeSingle();

    if (releaseError) {
      console.error("[API] Release manifest GET error:", releaseError);
      return NextResponse.json({ error: releaseError.message }, { status: 500 });
    }

    if (!release) {
      return NextResponse.json({ error: "Wydanie nie zostało znalezione" }, { status: 404 });
    }

    const typedRelease = release as GameRelease;

    const serviceClient = createServiceClient();
    const { data: fileBlob, error: downloadError } = await serviceClient.storage
      .from(STORAGE_BUCKETS.GAME_BUILDS)
      .download(typedRelease.manifest_path);

    if (downloadError || !fileBlob) {
      console.error("[API] Release manifest download error:", downloadError);
      return NextResponse.json({ error: "Nie udało się pobrać manifestu" }, { status: 500 });
    }

    const manifestText = await fileBlob.text();
    const manifest = JSON.parse(manifestText) as GameManifest;

    return NextResponse.json({
      success: true,
      data: {
        manifest,
        executable_path: typedRelease.executable_path,
        version: typedRelease.version,
        platform: typedRelease.platform,
      },
    });
  } catch (error) {
    console.error("[API] Release manifest GET unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
