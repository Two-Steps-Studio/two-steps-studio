import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();

  const [
    { data: warnings, error: warningsError },
    { data: actions, error: actionsError },
    { data: activity, error: activityError },
  ] = await Promise.all([
    supabase
      .from("mod_warnings")
      .select("id, user_id, moderator_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("mod_actions")
      .select("id, type, user_id, moderator_id, reason, duration_minutes, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("activity_log")
      .select("id, type, username, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (warningsError) console.error("[bot-logs] mod_warnings error:", warningsError.message);
  // mod_actions may not exist yet (PGRST205) if the migration hasn't been
  // applied - degrade to warnings-only rather than erroring the whole route.
  if (actionsError && actionsError.code !== "PGRST205") console.error("[bot-logs] mod_actions error:", actionsError.message);
  if (activityError) console.error("[bot-logs] activity_log error:", activityError.message);

  // Both tables only store Discord snowflakes (user_id/moderator_id), not
  // names - resolve them against profiles in one batch instead of a lookup
  // per row.
  const ids = Array.from(
    new Set([
      ...(warnings || []).flatMap((w) => [w.user_id, w.moderator_id]),
      ...(actions || []).flatMap((a) => [a.user_id, a.moderator_id]),
    ])
  );
  let usernameById: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
    usernameById = Object.fromEntries((profiles || []).map((p) => [p.id, p.username || p.id]));
  }

  // Unified moderation feed - a warn is functionally the same kind of
  // event as a kick/ban/timeout (something a mod did to a user, with a
  // reason), just previously split across two separate tables/panels for
  // no real reason.
  const moderation = [
    ...(warnings || []).map((w) => ({
      id: `warn-${w.id}`,
      type: "warn" as const,
      username: usernameById[w.user_id] || w.user_id,
      moderator: usernameById[w.moderator_id] || w.moderator_id,
      reason: w.reason,
      duration_minutes: null as number | null,
      created_at: w.created_at,
    })),
    ...(actions || []).map((a) => ({
      id: `${a.type}-${a.id}`,
      type: a.type as "kick" | "ban" | "timeout",
      username: usernameById[a.user_id] || a.user_id,
      moderator: usernameById[a.moderator_id] || a.moderator_id,
      reason: a.reason,
      duration_minutes: a.duration_minutes,
      created_at: a.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  return NextResponse.json({ moderation, activity: activity || [] });
}
