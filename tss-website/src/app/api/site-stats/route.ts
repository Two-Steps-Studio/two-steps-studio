import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Statistics unavailable - contact administrator" },
      { status: 503 }
    );
  }

  // Public, read-only aggregate counts (no PII) - rendered on the public
  // homepage for anonymous visitors too, so this must not require auth.
  // Use RPC function for optimized single-query statistics
  const { data, error } = await supabase.rpc('get_site_stats');

  if (error) {
    console.error('Site stats RPC error:', error);
    // Fallback to individual queries if RPC fails
    const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [onlineSiteResult, onlineLoggedResult, onlineAnonResult, totalProfilesResult] = await Promise.all([
      supabase.from("site_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen", threshold),
      supabase.from("site_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen", threshold).not("user_id", "is", null),
      supabase.from("site_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen", threshold).is("user_id", null),
      supabase.from("profiles").select("*", { count: "exact", head: true })
    ]);

    return NextResponse.json({
      online_site: onlineSiteResult.count || 0,
      online_logged_in: onlineLoggedResult.count || 0,
      online_anonymous: onlineAnonResult.count || 0,
      total_profiles: totalProfilesResult.count || 0,
    });
  }

  return NextResponse.json({
    online_site: data?.online_site || 0,
    online_logged_in: data?.online_logged_in || 0,
    online_anonymous: data?.online_anonymous || 0,
    total_profiles: data?.total_profiles || 0,
  });
}
