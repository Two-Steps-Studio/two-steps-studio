import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { getReleaseFilePath, createGameFileUploadUrl } from "@/lib/supabase-storage";
import { isSafeRelativePath } from "@/lib/game-manifest";
import { FILE_SIZE_LIMITS } from "@/lib/storage-constants";
import type { GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ releaseId: string }>;
}

// POST /api/admin/games/releases/[releaseId]/upload-url  { relativePath, size }
// Issues one signed upload URL for one game build file. The Next.js server
// never receives the file bytes — the admin's browser PUTs directly to
// Storage using the returned token.
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
  // Service role: this release row is still a draft, invisible to the
  // authenticated-role SELECT policy (published-only) — requireAdmin() above
  // is what actually authorizes reading/using it here.
  const supabase = createServiceClient();

  try {
    const { releaseId } = await params;

    const body = await request.json();
    const relativePath: string = body?.relativePath;
    const size: number = body?.size;

    if (!isSafeRelativePath(relativePath)) {
      return NextResponse.json({ error: `Nieprawidłowa ścieżka pliku: ${relativePath}` }, { status: 400 });
    }
    if (typeof size !== "number" || size < 0 || size > FILE_SIZE_LIMITS.GAME_BUILD_FILE) {
      return NextResponse.json({ error: "Nieprawidłowy rozmiar pliku" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "To wydanie nie jest już edytowalne (nie jest szkicem)" }, { status: 409 });
    }

    const storagePath = getReleaseFilePath(typedRelease.game_id, typedRelease.platform, typedRelease.version, relativePath);
    const uploadData = await createGameFileUploadUrl(storagePath);

    return NextResponse.json({ success: true, data: uploadData });
  } catch (error) {
    console.error("[API] Admin release upload-url POST unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
