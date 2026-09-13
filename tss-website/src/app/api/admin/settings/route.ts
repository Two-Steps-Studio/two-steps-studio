import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

// Keys the bot reads via settings.js (with a .env fallback when unset here)
// - see tss-dc-bot/settings.js and db/user_roles_schema.sql.
const SETTING_KEYS = [
  "MOD_LOG_CHANNEL_ID",
  "TICKET_STAFF_ROLE_ID",
  "JOIN_TO_CREATE_CHANNEL_ID",
  "AUTO_ROLE_ID",
  "STATS_CHANNEL_ID",
  "DISCORD_RECRUITMENT_CHANNEL_ID",
  "DISCORD_ADMIN_RECRUITMENT_CHANNEL_ID",
  "DISCORD_GENERAL_RECRUITMENT_CHANNEL_ID",
  "BLOCKED_WORDS",
] as const;

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("bot_settings").select("key, value");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const values: Record<string, string> = {};
  for (const row of data || []) values[row.key] = row.value || "";

  return NextResponse.json({ keys: SETTING_KEYS, values });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const updates = Object.entries(body).filter(([key]) => (SETTING_KEYS as readonly string[]).includes(key));
  if (updates.length === 0) {
    return NextResponse.json({ error: "Brak znanych kluczy do zapisania" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("bot_settings")
    .upsert(
      updates.map(([key, value]) => ({ key, value: String(value ?? ""), updated_at: new Date().toISOString() })),
      { onConflict: "key" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
