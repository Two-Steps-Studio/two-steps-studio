import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

const SNOWFLAKE = /^\d{15,20}$/;

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_commands")
    .select("id, type, status, error, payload, created_at, processed_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    // Table not applied yet - report clearly instead of a raw 500, the
    // panel needs to tell the admin to run the migration.
    if (error.code === "PGRST205") {
      return NextResponse.json({ commands: [], migrationMissing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commands: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  if (!body || (body.type !== "giveaway_start" && body.type !== "ticket_panel")) {
    return NextResponse.json({ error: "Nieobsługiwany typ polecenia" }, { status: 400 });
  }

  const { channel_id } = body.payload || {};
  if (!SNOWFLAKE.test(String(channel_id || ""))) {
    return NextResponse.json({ error: "Nieprawidłowe ID kanału" }, { status: 400 });
  }

  let payload: Record<string, unknown> = { channel_id: String(channel_id) };

  if (body.type === "giveaway_start") {
    const { prize, winner_count, minutes } = body.payload || {};
    if (!prize || typeof prize !== "string" || prize.length > 200) {
      return NextResponse.json({ error: "Podaj nagrodę (max 200 znaków)" }, { status: 400 });
    }
    const winnerCount = Number(winner_count) || 1;
    const durationMinutes = Number(minutes) || 0;
    if (winnerCount < 1 || winnerCount > 20) {
      return NextResponse.json({ error: "Liczba zwycięzców musi być między 1 a 20" }, { status: 400 });
    }
    if (durationMinutes < 1 || durationMinutes > 60 * 24 * 30) {
      return NextResponse.json({ error: "Czas trwania musi być między 1 minutą a 30 dniami" }, { status: 400 });
    }
    payload = { ...payload, prize, winner_count: winnerCount, minutes: durationMinutes };
  }

  const supabase = createServiceClient();
  const requestedBy = auth.profile?.id || auth.user.id;

  const { data, error } = await supabase
    .from("bot_commands")
    .insert({
      type: body.type,
      payload,
      requested_by: requestedBy,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      return NextResponse.json({ error: "Tabela bot_commands nie istnieje jeszcze w bazie - wklej db/bot_commands_schema.sql." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ command: data });
}
