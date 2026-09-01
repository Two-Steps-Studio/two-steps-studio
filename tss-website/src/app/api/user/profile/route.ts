import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// PATCH /api/user/profile — profile-customization fields only (username,
// avatar, background, equipped cosmetics). Mirrors the allowlist/blocklist
// pattern already used by api/user/settings/route.ts.
//
// profile-form.tsx used to upsert straight through the browser Supabase
// client with whatever `money`/`pln_balance` happened to be sitting in
// React state since page load - a stale tab could silently revert a
// user's real balance back to an old value on an unrelated save (just
// changing a username), and nothing server-side stopped a request crafted
// outside the UI from setting those fields to anything. This route never
// accepts money/pln_balance/xp/level/rank/etc. at all.
export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Profile service disabled" },
      { status: 503 }
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID - same resolution as api/user/settings/route.ts.
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // SECURITY: only these profile-customization fields may be written here.
  // money/pln_balance/xp/level/rank/settings/etc. are never accepted -
  // anything else in the request body is rejected outright.
  const ALLOWED_FIELDS = ["username", "avatar_url", "background", "equipped_frame", "equipped_nick_color"];

  const unknownFields = Object.keys(body).filter((field) => !ALLOWED_FIELDS.includes(field));
  if (unknownFields.length > 0) {
    console.error(`[SECURITY] User ${discordId} attempted to modify unknown/blocked profile fields:`, unknownFields);
    return NextResponse.json({ error: "Invalid field in request" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if ("username" in body) {
    if (typeof body.username === "string" && body.username.trim().length > 0 && body.username.length <= 50) {
      updateData.username = body.username.trim();
    } else {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
  }

  if ("avatar_url" in body) {
    if (typeof body.avatar_url === "string" && body.avatar_url.length > 0 && body.avatar_url.length <= 2000) {
      updateData.avatar_url = body.avatar_url;
    } else {
      return NextResponse.json({ error: "Invalid avatar_url" }, { status: 400 });
    }
  }

  if ("background" in body) {
    if (typeof body.background === "string" && body.background.length > 0 && body.background.length <= 100) {
      updateData.background = body.background;
    } else {
      return NextResponse.json({ error: "Invalid background" }, { status: 400 });
    }
  }

  if ("equipped_frame" in body) {
    if (body.equipped_frame === null || typeof body.equipped_frame === "string") {
      updateData.equipped_frame = body.equipped_frame;
    } else {
      return NextResponse.json({ error: "Invalid equipped_frame" }, { status: 400 });
    }
  }

  if ("equipped_nick_color" in body) {
    if (body.equipped_nick_color === null || typeof body.equipped_nick_color === "string") {
      updateData.equipped_nick_color = body.equipped_nick_color;
    } else {
      return NextResponse.json({ error: "Invalid equipped_nick_color" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: discordId,
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("[API] Profile update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
