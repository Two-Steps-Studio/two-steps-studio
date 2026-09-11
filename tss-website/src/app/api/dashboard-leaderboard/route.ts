import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Public, read-only leaderboard for the TV dashboard (/dashboard) - no
// login wall there, so this uses the service client rather than relying on
// anon-key RLS on `profiles` being permissive (verified elsewhere this
// session that RLS on similar tables can silently return nothing for
// anon). Only non-sensitive, already-public fields are selected.
export async function GET() {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Baza danych niedostępna" }, { status: 503 });
  }

  try {
    const [byLevel, byMoney] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, level, xp")
        .order("level", { ascending: false })
        .order("xp", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select("id, username, avatar_url, money")
        .order("money", { ascending: false })
        .limit(5),
    ]);

    if (byLevel.error || byMoney.error) {
      const error = byLevel.error || byMoney.error;
      console.error("[dashboard-leaderboard] error:", error?.message);
      return NextResponse.json({ error: error?.message }, { status: 500 });
    }

    return NextResponse.json({
      byLevel: byLevel.data || [],
      byMoney: byMoney.data || [],
    });
  } catch (err) {
    console.error("[dashboard-leaderboard] unexpected error:", err);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}
