import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Settings service disabled" },
      { status: 503 }
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID. user.id never matched the real row for a
  // Discord-linked account, so the "create if missing" fallback below was
  // silently creating a duplicate, disconnected profile row per user keyed
  // by their auth UUID — every visibility toggle saved here updated that
  // phantom row, with no effect on the real profile the Discord bot and
  // proxy.ts's category-visibility gate actually read.
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("games_visible, records_visible, dev_visible, project_limit, joined_projects_limit, subscription_plan")
    .eq("id", discordId)
    .maybeSingle();

  if (profileError) {
    console.error("Profile error:", profileError);
    return NextResponse.json({ error: "Failed to fetch user settings: " + profileError.message }, { status: 500 });
  }

  if (!profile) {
    console.error("Profile not found for user:", discordId);
    // Create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: discordId,
        games_visible: true,
        records_visible: true,
        dev_visible: true,
        project_limit: 1,
        joined_projects_limit: 3,
        subscription_plan: 'free',
      })
      .select()
      .single();

    if (createError || !newProfile) {
      return NextResponse.json({ error: "Profile not found and failed to create: " + createError?.message }, { status: 500 });
    }

    // Use the newly created profile
    profile = newProfile;
  }

  // Count current projects
  const { count: ownProjectsCount } = await supabase
    .from("dev_projects")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  // Count joined projects
  const { count: joinedProjectsCount } = await supabase
    .from("dev_project_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Default DEV visibility: TRUE (always visible)
  let devVisible = profile?.dev_visible;
  if (devVisible === null || devVisible === undefined) {
    devVisible = true;
  }

  // Update profile if dev_visible needs to be set for the first time
  if (profile && (profile.dev_visible === null || profile.dev_visible === undefined)) {
    await supabase
      .from("profiles")
      .update({ dev_visible: devVisible })
      .eq("id", discordId);
  }

  return NextResponse.json({
    visibility: {
      games: profile?.games_visible ?? true,
      records: profile?.records_visible ?? true,
      dev: devVisible,
    },
    limits: {
      own_projects: {
        current: ownProjectsCount || 0,
        limit: profile?.project_limit || 1,
      },
      joined_projects: {
        current: joinedProjectsCount || 0,
        limit: profile?.joined_projects_limit || 3,
      },
    },
    subscription: profile?.subscription_plan || 'free',
  });
}

export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Settings service disabled" },
      { status: 503 }
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID — see the GET handler above for the full story.
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Check if profile exists, create if not
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", discordId)
    .maybeSingle();

  if (!existingProfile) {
    // Create profile with default values
    const { error: createError } = await supabase
      .from("profiles")
      .insert({
        id: discordId,
        games_visible: true,
        records_visible: true,
        dev_visible: true,
        project_limit: 1,
        joined_projects_limit: 3,
        subscription_plan: 'free',
      });

    if (createError) {
      return NextResponse.json({ error: "Failed to create profile: " + createError.message }, { status: 500 });
    }
  }

  const body = await request.json();
  
  // SECURITY: Whitelist of allowed fields
  const ALLOWED_FIELDS = ['username', 'games_visible', 'records_visible', 'dev_visible'];
  
  // SECURITY: Blocked fields that users should never be able to modify
  const BLOCKED_FIELDS = ['money', 'bank', 'pln_balance', 'xp', 'level', 'rank', 'role', 'permissions', 'settings', 'is_admin', 'isAdmin', 'project_limit', 'joined_projects_limit', 'subscription_plan'];
  
  // SECURITY: Log if user attempts to modify blocked fields
  const attemptedBlockedFields = BLOCKED_FIELDS.filter(field => field in body);
  if (attemptedBlockedFields.length > 0) {
    console.error(`[SECURITY] User ${user.id} attempted to modify blocked fields:`, attemptedBlockedFields);
    console.error(`[SECURITY] Request body:`, body);
    // Return error but don't reveal which fields were blocked
    return NextResponse.json({ error: "Invalid field in request" }, { status: 400 });
  }
  
  // SECURITY: Only process allowed fields
  const updateData: {
    username?: string;
    games_visible?: boolean;
    records_visible?: boolean;
    dev_visible?: boolean;
  } = {};
  
  if ('username' in body) {
    if (typeof body.username === "string" && body.username.length > 0 && body.username.length <= 50) {
      updateData.username = body.username.trim();
    } else {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
  }
  
  if ('games_visible' in body) {
    if (typeof body.games_visible === "boolean") {
      updateData.games_visible = body.games_visible;
    } else {
      return NextResponse.json({ error: "Invalid games_visible value" }, { status: 400 });
    }
  }
  
  if ('records_visible' in body) {
    if (typeof body.records_visible === "boolean") {
      updateData.records_visible = body.records_visible;
    } else {
      return NextResponse.json({ error: "Invalid records_visible value" }, { status: 400 });
    }
  }
  
  if ('dev_visible' in body) {
    if (typeof body.dev_visible === "boolean") {
      updateData.dev_visible = body.dev_visible;
    } else {
      return NextResponse.json({ error: "Invalid dev_visible value" }, { status: 400 });
    }
  }

  // SECURITY: Log if user attempts to send unknown fields
  const unknownFields = Object.keys(body).filter(field => !ALLOWED_FIELDS.includes(field));
  if (unknownFields.length > 0) {
    console.error(`[SECURITY] User ${user.id} attempted to modify unknown fields:`, unknownFields);
    console.error(`[SECURITY] Request body:`, body);
    return NextResponse.json({ error: "Invalid field in request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", discordId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Profile not found after update" }, { status: 404 });
  }

  return NextResponse.json({
    visibility: {
      games: data.games_visible,
      records: data.records_visible,
      dev: data.dev_visible,
    },
  });
}
