import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { isValidPlatform } from "@/lib/game-manifest";
import type { GameRelease } from "@/types/game-distribution";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/games/[id]/releases/current?platform=windows
// Returns the currently-published release for a game+platform, used by the
// Electron client to check "do I have the latest version installed".
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
    const { id } = await params;
    const gameId = parseInt(id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Nieprawidłowe ID gry" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'windows';
    if (!isValidPlatform(platform)) {
      return NextResponse.json({ error: "Nieprawidłowa platforma" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("game_releases")
      .select("*")
      .eq("game_id", gameId)
      .eq("platform", platform)
      .eq("status", "published")
      .eq("is_current", true)
      .maybeSingle();

    if (error) {
      console.error("[API] Game release current GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: data as GameRelease });
  } catch (error) {
    console.error("[API] Game release current GET unexpected error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
