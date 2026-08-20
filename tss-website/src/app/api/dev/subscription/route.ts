import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { UserProfileWithSubscription } from "@/lib/types/dev-types";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev module disabled - contact administrator" },
      { status: 503 }
    );
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID — user.id never matches the real row for a
  // Discord-linked account.
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Get user's subscription info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, project_limit, subscription_plan, subscription_status, subscription_expires_at")
    .eq("id", discordId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }

  const subscriptionData: UserProfileWithSubscription = {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    project_limit: profile.project_limit || 1,
    subscription_plan: profile.subscription_plan || 'free',
    subscription_status: profile.subscription_status || 'active',
    subscription_expires_at: profile.subscription_expires_at,
  };

  return NextResponse.json(subscriptionData);
}
