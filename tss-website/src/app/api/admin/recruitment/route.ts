import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { createClient, createServiceClient } from "@/lib/supabase-server";

const VALID_STATUSES = ["pending", "accepted", "rejected"];

// Staff-facing view of recruitment_applications
// (db/migrations/add-recruitment-applications.sql) - the only way to see
// submitted applications used to be watching a Discord channel in real
// time, with no way to find one again once it scrolled off, no status
// tracking, and total data loss if the Discord post itself failed.
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Admin panel disabled" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("recruitment_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  const body = await request.json();
  const { id, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  // Same pattern as api/admin/users: writing to a row that isn't the
  // caller's own, so the session-bound client's RLS (deny-by-default,
  // see the migration) would reject it despite requireAdmin() above
  // already authorizing the action at the application layer.
  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Admin panel disabled" }, { status: 503 });
  }

  // recruitment_applications.reviewed_by references profiles.id, which is
  // the Discord snowflake (auth.profile.id here) - NOT the Supabase Auth
  // UUID getUserId()/auth.user.id would give (see requireAuth()'s own
  // comment on this exact mismatch).
  const { error } = await serviceClient
    .from("recruitment_applications")
    .update({
      status,
      reviewed_by: auth.profile?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
