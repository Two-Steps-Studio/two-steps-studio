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
    .select("id, username, avatar_url, xp, level, project_limit, subscription_plan, created_at", { count: "exact" })
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
    totalPages: Math.ceil((count || 0) / limit)
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
  const { userId, project_limit, subscription_plan } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const updateData: any = {};
  if (project_limit !== undefined) updateData.project_limit = project_limit;
  if (subscription_plan !== undefined) updateData.subscription_plan = subscription_plan;

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
