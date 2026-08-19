import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { listReleaseFiles } from "@/lib/supabase-storage";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import { isSafeRelativePath, isValidSha256 } from "@/lib/game-manifest";
import type { GameManifest, GameRelease } from "@/types/game-distribution";
import { createHash } from "node:crypto";

interface RouteParams {
  params: Promise<{ releaseId: string }>;
}

// POST /api/admin/games/releases/[releaseId]/finalize  { setAsCurrent?: boolean }
// Re-derives everything from Storage (the authoritative source, not the
// request body): downloads manifest.json that was already uploaded, checks
// every listed file is actually present with the right size, and only then
// flips draft -> published. If anything's missing/mismatched, the release
// stays draft and the response says exactly what's left — safe to retry
// after resuming the upload.
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  try {
    await createClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }
  // Service role throughout: this release is a draft (invisible to the
  // authenticated-role SELECT policy) and finalize both updates it and
  // manages is_current across rows — requireAdmin() above is what actually
  // authorizes all of this.
  const supabase = createServiceClient();

  try {
    const { releaseId } = await params;
    const body = await request.json().catch(() => ({}));
    const setAsCurrent: boolean = body?.setAsCurrent === true;

    const { data: release, error: releaseError } = await supabase
      .from("game_releases")
      .select("*")
      .eq("id", releaseId)
      .maybeSingle();

    if (releaseError) {
      return NextResponse.json({ error: releaseError.message }, { status: 500 });
    }
    if (!release) {
      return NextResponse.json({ error: "Wydanie nie zostało znalezione" }, { status: 404 });
    }
    const typedRelease = release as GameRelease;
    if (typedRelease.status !== "draft") {
      return NextResponse.json({ error: "To wydanie zostało już opublikowane lub zarchiwizowane" }, { status: 409 });
    }

    const { data: manifestBlob, error: manifestDownloadError } = await supabase.storage
      .from(STORAGE_BUCKETS.GAME_BUILDS)
      .download(typedRelease.manifest_path);

    if (manifestDownloadError || !manifestBlob) {
      return NextResponse.json(
        { error: "Plik manifest.json nie został jeszcze przesłany", missingFiles: [] },
        { status: 409 }
      );
    }

    const manifestText = await manifestBlob.text();
    let manifest: GameManifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      return NextResponse.json({ error: "Plik manifest.json jest uszkodzony (nieprawidłowy JSON)" }, { status: 400 });
    }

    if (!manifest || !Array.isArray(manifest.files) || manifest.files.length === 0) {
      return NextResponse.json({ error: "Manifest nie zawiera żadnych plików" }, { status: 400 });
    }

    for (const entry of manifest.files) {
      if (!isSafeRelativePath(entry.path) || typeof entry.size !== "number" || entry.size < 0 || !isValidSha256(entry.sha256)) {
        return NextResponse.json({ error: `Nieprawidłowy wpis w manifeście: ${JSON.stringify(entry).slice(0, 200)}` }, { status: 400 });
      }
    }

    const uploaded = await listReleaseFiles(typedRelease.game_id, typedRelease.platform, typedRelease.version);

    const missingFiles: string[] = [];
    let totalSizeBytes = 0;
    for (const entry of manifest.files) {
      const uploadedSize = uploaded.get(entry.path);
      if (uploadedSize === undefined || uploadedSize !== entry.size) {
        missingFiles.push(entry.path);
      }
      totalSizeBytes += entry.size;
    }

    if (missingFiles.length > 0) {
      return NextResponse.json(
        { error: `Brakuje ${missingFiles.length} plik(ów) lub ich rozmiar się nie zgadza`, missingFiles },
        { status: 409 }
      );
    }

    const manifestSha256 = createHash("sha256").update(manifestText).digest("hex");

    const { data: updated, error: updateError } = await supabase
      .from("game_releases")
      .update({
        status: "published",
        manifest_sha256: manifestSha256,
        total_size_bytes: totalSizeBytes,
        file_count: manifest.files.length,
        published_at: new Date().toISOString(),
      })
      .eq("id", releaseId)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Admin release finalize update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (setAsCurrent) {
      // Sequential, not a single DB transaction (Supabase JS client has no
      // multi-statement transaction support without an RPC) — acceptable
      // for a low-concurrency admin action: the partial unique index on
      // (game_id, platform) WHERE is_current still guarantees at most one
      // "current" row ever exists, worst case is a brief window with zero.
      const { error: unsetError } = await supabase
        .from("game_releases")
        .update({ is_current: false })
        .eq("game_id", typedRelease.game_id)
        .eq("platform", typedRelease.platform)
        .eq("is_current", true);

      if (unsetError) {
        console.error("[API] Admin release finalize unset-current error:", unsetError);
        return NextResponse.json({ error: unsetError.message }, { status: 500 });
      }

      const { error: setCurrentError } = await supabase
        .from("game_releases")
        .update({ is_current: true })
        .eq("id", releaseId);

      if (setCurrentError) {
        console.error("[API] Admin release finalize set-current error:", setCurrentError);
        return NextResponse.json({ error: setCurrentError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...(updated as GameRelease), is_current: setAsCurrent || (updated as GameRelease).is_current },
      message: "Wydanie zostało opublikowane",
    });
  } catch (error) {
    console.error("[API] Admin release finalize POST unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
