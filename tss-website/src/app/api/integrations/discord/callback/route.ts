import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { exchangeCodeForToken, getDiscordUser, getDiscordAvatarUrl } from "@/lib/discord-oauth";

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

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  // SECURITY: verify state against the httpOnly cookie set by /connect, not
  // a client-suppliable "stored_state" query param (see connect/route.ts -
  // that old check compared two attacker-controllable values against each
  // other and could always be satisfied, and also never matched for real
  // users since Discord's redirect never actually carried that param).
  const cookieStore = await cookies();
  const storedState = cookieStore.get("discord_oauth_state")?.value;

  if (!state || !storedState || state !== storedState) {
    const res = NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
    res.cookies.delete("discord_oauth_state");
    return res;
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get Discord user data
    const discordUser = await getDiscordUser(tokenData.access_token);

    // Check if Discord account is already connected to another user
    const { data: existingIntegration } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "discord")
      .eq("provider_user_id", discordUser.id)
      .maybeSingle();

    if (existingIntegration && existingIntegration.user_id !== user.id) {
      return NextResponse.redirect(
        new URL("/settings?error=discord_already_connected", request.url)
      );
    }

    // Check if user already has Discord integration
    const { data: userIntegration } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "discord")
      .maybeSingle();

    // Both writes below used to be fire-and-forget (error never checked),
    // so a rejected insert/update (e.g. an RLS or constraint failure) still
    // redirected to the success page telling the user Discord was linked
    // when it wasn't.
    let writeError;
    if (userIntegration) {
      // Update existing integration
      ({ error: writeError } = await supabase
        .from("user_integrations")
        .update({
          username: discordUser.username,
          avatar: getDiscordAvatarUrl(discordUser.id, discordUser.avatar),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          metadata: {
            discriminator: discordUser.discriminator,
            email: discordUser.email,
            verified: discordUser.verified,
          },
        })
        .eq("id", userIntegration.id));
    } else {
      // Create new integration
      ({ error: writeError } = await supabase
        .from("user_integrations")
        .insert({
          user_id: user.id,
          provider: "discord",
          provider_user_id: discordUser.id,
          username: discordUser.username,
          avatar: getDiscordAvatarUrl(discordUser.id, discordUser.avatar),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          metadata: {
            discriminator: discordUser.discriminator,
            email: discordUser.email,
            verified: discordUser.verified,
          },
        }));
    }

    if (writeError) {
      console.error("Discord integration write failed:", writeError.message);
      const res = NextResponse.redirect(new URL("/settings?error=discord_connection_failed", request.url));
      res.cookies.delete("discord_oauth_state");
      return res;
    }

    // Also stamp discord_id on this account's own profiles row, so code
    // that looks a user up by their Discord identity (see auth-helpers.ts)
    // can find an email-registered account once Discord is connected, not
    // just accounts that signed up via Discord OAuth directly. Best-effort:
    // the integration link above is the source of truth and already
    // succeeded, so a failure here shouldn't block a successful connect.
    // Through the service client - profiles' own update policy has a
    // documented history of silently rejecting writes (see
    // fix-profiles-update-policy.sql), not worth risking here.
    try {
      const serviceClient = createServiceClient();
      const { error: discordIdError } = await serviceClient
        .from("profiles")
        .update({ discord_id: discordUser.id })
        .eq("id", user.id);
      if (discordIdError) console.error("discord_id sync failed:", discordIdError.message);
    } catch (e: any) {
      console.error("discord_id sync failed:", e.message);
    }

    // Redirect back to settings with success
    const res = NextResponse.redirect(
      new URL("/settings?success=discord_connected", request.url)
    );
    res.cookies.delete("discord_oauth_state");
    return res;

  } catch (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=discord_connection_failed", request.url)
    );
  }
}
