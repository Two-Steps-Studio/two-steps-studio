import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

type PresenceRow = {
  session_id: string;
  user_id: string | null;
  seen_at: string;
};

export async function GET() {
  // Public, read-only aggregate history (only bucketed counts are ever
  // returned, never raw session/user IDs) - used the session-bound anon
  // client before, and site_presence has RLS with no anon-read policy
  // (verified live: an anon-key SELECT returns [] against a table that
  // actually has hundreds of rows via the service client), so the 24h
  // activity chart was always empty for every visitor. Same fix already
  // applied to get_unified_stats() this session.
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Site stats unavailable - contact administrator" },
      { status: 503 }
    );
  }
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const bucketMs = 15 * 60 * 1000;
  const start = new Date(now - windowMs).toISOString();

  const { data, error } = await supabase
    .from("site_presence")
    .select("session_id,user_id,seen_at")
    .gte("seen_at", start)
    .order("seen_at", { ascending: true }) as unknown as { data: PresenceRow[]; error: any };

  const safeData: PresenceRow[] = Array.isArray((data as any)) ? (data as any) as PresenceRow[] : [];

  const bucketStart = (ts: number) => Math.floor(ts / bucketMs) * bucketMs;
  const endBucket = bucketStart(now);
  const startBucket = endBucket - windowMs;

  const totalMap = new Map<number, Set<string>>();
  const loggedMap = new Map<number, Set<string>>();
  const anonMap = new Map<number, Set<string>>();

  for (const row of (safeData || [])) {
    const t = new Date(row.seen_at).getTime();
    const b = bucketStart(t);
    if (b < startBucket || b > endBucket) continue;
    const totalSet = totalMap.get(b) ?? new Set<string>();
    totalSet.add(row.session_id);
    totalMap.set(b, totalSet);
    if (row.user_id) {
      const s = loggedMap.get(b) ?? new Set<string>();
      s.add(row.session_id);
      loggedMap.set(b, s);
    } else {
      const s = anonMap.get(b) ?? new Set<string>();
      s.add(row.session_id);
      anonMap.set(b, s);
    }
  }

  const buckets: { t: string; total: number; logged_in: number; anonymous: number }[] = [];
  for (let b = startBucket; b <= endBucket; b += bucketMs) {
    buckets.push({
      t: new Date(b).toISOString(),
      total: (totalMap.get(b)?.size ?? 0),
      logged_in: (loggedMap.get(b)?.size ?? 0),
      anonymous: (anonMap.get(b)?.size ?? 0),
    });
  }

  return NextResponse.json({ buckets, bucket_minutes: 15, window_hours: 24 });
}
