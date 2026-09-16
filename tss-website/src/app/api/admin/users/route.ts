import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { createClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Admin panel disabled" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";

  let query = supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, xp, level, created_at, money, bank, vip_status, svip_status, mvip_status, discord_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.ilike("username", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  // Writing to another user's row here, not the caller's own -- the
  // profiles table's UPDATE RLS policy only allows a row's owner to update
  // it, so the session-bound anon client this used to use would have this
  // silently rejected by RLS for any target other than the admin
  // themselves, despite requireAdmin() above already having authorized the
  // action at the application layer. Same fix as the games/music/podcasts
  // admin routes: use the service-role client for the actual write.
  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Admin panel disabled" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { userId, money, bank, level, vip_status, svip_status, mvip_status } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Straight from the request body with no type/range check before this -
  // an admin-only route, but still worth guarding against a stray string,
  // negative, or absurd value landing directly in a real-money-adjacent
  // column via a typo'd request.
  const isNonNegativeInt = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v >= 0;

  const updateData: any = {};
  if (money !== undefined) {
    if (!isNonNegativeInt(money)) return NextResponse.json({ error: "money must be a non-negative integer" }, { status: 400 });
    updateData.money = money;
  }
  if (bank !== undefined) {
    if (!isNonNegativeInt(bank)) return NextResponse.json({ error: "bank must be a non-negative integer" }, { status: 400 });
    updateData.bank = bank;
  }
  if (level !== undefined) {
    if (!isNonNegativeInt(level) || level < 1 || level > 100) return NextResponse.json({ error: "level must be an integer from 1 to 100" }, { status: 400 });
    updateData.level = level;
  }
  if (vip_status !== undefined) {
    if (typeof vip_status !== "boolean") return NextResponse.json({ error: "vip_status must be a boolean" }, { status: 400 });
    updateData.vip_status = vip_status;
  }
  if (svip_status !== undefined) {
    if (typeof svip_status !== "boolean") return NextResponse.json({ error: "svip_status must be a boolean" }, { status: 400 });
    updateData.svip_status = svip_status;
  }
  if (mvip_status !== undefined) {
    if (typeof mvip_status !== "boolean") return NextResponse.json({ error: "mvip_status must be a boolean" }, { status: 400 });
    updateData.mvip_status = mvip_status;
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
