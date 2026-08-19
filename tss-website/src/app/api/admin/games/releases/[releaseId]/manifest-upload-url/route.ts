import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { createGameFileUploadUrl } from "@/lib/supabase-storage";
import type { GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ releaseId: string }>;
}

// POST /api/admin/games/releases/[releaseId]/manifest-upload-url
// Separate from upload-url so finalize can cleanly distinguish "all game
// files uploaded" from "manifest.json itself uploaded".
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
  // Service role: draft rows aren't visible to the authenticated-role SELECT
  // policy — requireAdmin() above is what authorizes this.
  const supabase = createServiceClient();

  try {
    const { releaseId } = await params;

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

    const uploadData = await createGameFileUploadUrl(typedRelease.manifest_path);

    return NextResponse.json({ success: true, data: uploadData });
  } catch (error) {
    console.error("[API] Admin release manifest-upload-url POST unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
