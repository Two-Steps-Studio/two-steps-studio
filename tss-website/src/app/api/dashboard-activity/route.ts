import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Public, read-only recent-activity feed for /dashboard (joins, level-ups,
// purchases - see tss-dc-bot/db/activity_log_schema.sql). Service client
// since activity_log has RLS with no anon policy, same as every other new
// table this session (deny-by-default, verified live more than once that
// the anon-key client silently returns nothing rather than erroring).
export async function GET() {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("type, username, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("[dashboard-activity] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (err) {
    console.error("[dashboard-activity] unexpected error:", err);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
