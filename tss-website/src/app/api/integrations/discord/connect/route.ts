import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateState, getDiscordAuthUrl } from "@/lib/discord-oauth";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Integrations service disabled" },
      { status: 503 }
    );
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has Discord integration
  const { data: existingIntegration } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "discord")
    .maybeSingle();

  if (existingIntegration) {
    return NextResponse.json(
      { error: "Discord already connected" },
      { status: 400 }
    );
  }

  // Generate state for OAuth flow
  const state = generateState();
  const authUrl = getDiscordAuthUrl(state);

  // The state has to round-trip through Discord's own redirect untouched to
  // prove this callback really followed a connection *this* browser
  // started. It can't live in localStorage/a returned JSON field - Discord's
  // redirect back to /callback only ever carries `code` and `state` (never
  // an app-defined "stored_state" param), so a client-side-only copy can
  // never reach the server route to be compared against. An httpOnly cookie
  // travels automatically with the redirect and can't be read or forged by
  // a page an attacker controls.
  const res = NextResponse.json({ authUrl });
  res.cookies.set("discord_oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
