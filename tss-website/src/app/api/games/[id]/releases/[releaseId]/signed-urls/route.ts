import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { getReleaseFilePath, createGameFileDownloadUrls } from "@/lib/supabase-storage";
import { isSafeRelativePath } from "@/lib/game-manifest";
import type { GameRelease, SignedDownloadEntry } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ id: string; releaseId: string }>;
}

const MAX_PATHS_PER_REQUEST = 5000;

// POST /api/games/[id]/releases/[releaseId]/signed-urls  { paths: string[] }
// paths are relative paths as they appear in the release's manifest.json.
// The full Storage object path is always built server-side from the
// release's own (trusted) game_id/platform/version — the caller can never
// address an object outside this release's prefix, regardless of what it
// sends as "paths".
export async function POST(request: Request, { params }: RouteParams) {
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

    const body = await request.json();
    const paths: unknown = body?.paths;
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: "Wymagana lista ścieżek plików" }, { status: 400 });
    }
    if (paths.length > MAX_PATHS_PER_REQUEST) {
      return NextResponse.json({ error: `Zbyt wiele plików w jednym żądaniu (limit: ${MAX_PATHS_PER_REQUEST})` }, { status: 400 });
    }

    const relativePaths: string[] = [];
    for (const p of paths) {
      if (typeof p !== 'string' || !isSafeRelativePath(p)) {
        return NextResponse.json({ error: `Nieprawidłowa ścieżka pliku: ${String(p)}` }, { status: 400 });
      }
      relativePaths.push(p);
    }

    const { data: release, error: releaseError } = await supabase
      .from("game_releases")
      .select("*")
      .eq("id", releaseId)
      .eq("game_id", gameId)
      .eq("status", "published")
      .maybeSingle();

    if (releaseError) {
      console.error("[API] Release signed-urls GET error:", releaseError);
      return NextResponse.json({ error: releaseError.message }, { status: 500 });
    }
    if (!release) {
      return NextResponse.json({ error: "Wydanie nie zostało znalezione" }, { status: 404 });
    }

    const typedRelease = release as GameRelease;

    const storagePaths = relativePaths.map((rel) =>
      getReleaseFilePath(typedRelease.game_id, typedRelease.platform, typedRelease.version, rel)
    );

    const signed = await createGameFileDownloadUrls(storagePaths, 3600);

    const storagePathToRelative = new Map(storagePaths.map((sp, i) => [sp, relativePaths[i]]));
    const results: SignedDownloadEntry[] = [];
    const failed: string[] = [];

    for (const entry of signed) {
      if (!entry.path) continue;
      const relative = storagePathToRelative.get(entry.path);
      if (!relative) continue;
      if (entry.error || !entry.signedUrl) {
        failed.push(relative);
        continue;
      }
      results.push({ path: relative, signedUrl: entry.signedUrl });
    }

    return NextResponse.json({ success: true, data: { urls: results, failed } });
  } catch (error) {
    console.error("[API] Release signed-urls POST unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
