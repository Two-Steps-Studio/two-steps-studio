import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import type { GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ releaseId: string }>;
}

// DELETE /api/admin/games/releases/[releaseId] — archive a release (never
// hard-deletes the underlying Storage objects in v1; that's a manual
// Supabase Storage cleanup task if disk space needs reclaiming).
export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  try {
    await createClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }
  // Service role: UPDATE on game_releases has no authenticated-role policy —
  // requireAdmin() above is what authorizes this archive action.
  const supabase = createServiceClient();

  try {
    const { releaseId } = await params;

    const { data: updated, error } = await supabase
      .from("game_releases")
      .update({ status: "archived", is_current: false })
      .eq("id", releaseId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[API] Admin release archive error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: "Wydanie nie zostało znalezione" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated as GameRelease, message: "Wydanie zostało zarchiwizowane" });
  } catch (error) {
    console.error("[API] Admin release DELETE unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
