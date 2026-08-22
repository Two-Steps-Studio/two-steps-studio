import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
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
  const storedState = searchParams.get("stored_state");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  // SECURITY: Verify state parameter to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/ustawettings?error=invalid_state", request.url)
    );
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

    if (userIntegration) {
      // Update existing integration
      await supabase
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
        .eq("id", userIntegration.id);
    } else {
      // Create new integration
      await supabase
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
        });
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/settings?success=discord_connected", request.url)
    );

  } catch (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=discord_connection_failed", request.url)
    );
  }
}
