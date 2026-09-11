import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("site_session_id")?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // presence-ping.tsx calls this every 30s from every page - it's the only
  // write path for "online now" stats. This used to be a no-op ("Don't use
  // Supabase in API routes"), so online-user counts on the homepage/sidebar
  // never reflected real traffic despite the ping firing the whole time.
  // site_sessions is an upsert (one row per session, latest last_seen) for
  // the current online count; site_presence is append-only, used by
  // site-stats-history for the 24h chart. Service client so this works for
  // anonymous visitors regardless of RLS on these tables.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const service = createServiceClient();
    const now = new Date().toISOString();
    await Promise.all([
      service.from("site_sessions").upsert(
        { session_id: sessionId, user_id: userId, last_seen: now },
        { onConflict: "session_id" }
      ),
      service.from("site_presence").insert({ session_id: sessionId, user_id: userId, seen_at: now }),
    ]);
  } catch (err) {
    console.error("[ping] presence write failed:", err);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("site_session_id", sessionId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  return res;
}
