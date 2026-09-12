import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();

  const [{ data: warnings, error: warningsError }, { data: activity, error: activityError }] = await Promise.all([
    supabase
      .from("mod_warnings")
      .select("id, user_id, moderator_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("activity_log")
      .select("id, type, username, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (warningsError) console.error("[bot-logs] mod_warnings error:", warningsError.message);
  if (activityError) console.error("[bot-logs] activity_log error:", activityError.message);

  // mod_warnings only stores Discord snowflakes (user_id/moderator_id), not
  // names - resolve them against profiles in one batch instead of a lookup
  // per row.
  const ids = Array.from(new Set((warnings || []).flatMap((w) => [w.user_id, w.moderator_id])));
  let usernameById: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
    usernameById = Object.fromEntries((profiles || []).map((p) => [p.id, p.username || p.id]));
  }

  const resolvedWarnings = (warnings || []).map((w) => ({
    ...w,
    username: usernameById[w.user_id] || w.user_id,
    moderator: usernameById[w.moderator_id] || w.moderator_id,
  }));

  return NextResponse.json({ warnings: resolvedWarnings, activity: activity || [] });
}
