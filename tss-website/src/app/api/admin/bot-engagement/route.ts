import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();

  const [{ data: giveaways, error: giveawaysError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase
      .from("giveaways")
      .select("id, prize, winner_count, ends_at, ended, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("tickets")
      .select("id, user_id, status, created_at, closed_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (giveawaysError) console.error("[bot-engagement] giveaways error:", giveawaysError.message);
  if (ticketsError) console.error("[bot-engagement] tickets error:", ticketsError.message);

  // tickets.user_id / giveaways.created_by are Discord snowflakes - resolve
  // against profiles in one batched query, same approach as bot-logs.
  const ids = Array.from(
    new Set([...(tickets || []).map((t) => t.user_id), ...(giveaways || []).map((g) => g.created_by)])
  );
  let usernameById: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
    usernameById = Object.fromEntries((profiles || []).map((p) => [p.id, p.username || p.id]));
  }

  return NextResponse.json({
    giveaways: (giveaways || []).map((g) => ({ ...g, created_by_name: usernameById[g.created_by] || g.created_by })),
    tickets: (tickets || []).map((t) => ({ ...t, user_name: usernameById[t.user_id] || t.user_id })),
  });
}
