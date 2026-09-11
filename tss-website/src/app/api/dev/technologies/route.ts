import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { CreateTechnologyData, UpdateTechnologyData, DevTechnology } from "@/lib/types/dev-types";
import { checkProjectPermission, checkProjectMembership, logActivity } from "@/lib/dev-permissions";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev technologies disabled - contact administrator" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  // Check if user has access to the project
  const membershipCheck = await checkProjectMembership(Number(projectId));
  if (!membershipCheck.hasAccess) {
    return NextResponse.json({ error: membershipCheck.error }, { status: 403 });
  }

  let query = supabase
    .from("dev_technologies")
    .select("*")
    .order("sort_order", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", Number(projectId));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev technologies disabled - contact administrator" },
      { status: 503 }
    );
  }

  const body: CreateTechnologyData = await request.json();
  const { project_id, name, icon_slug, version, category, description, sort_order } = body;

  // Check if user has permission to manage technologies
  const permissionCheck = await checkProjectPermission(project_id, 'manage_technologies');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  // Get max sort_order for this project if not provided
  let finalSortOrder = sort_order;
  if (!finalSortOrder) {
    const { data: existingTechs } = await supabase
      .from("dev_technologies")
      .select("sort_order")
      .eq("project_id", project_id)
      .order("sort_order", { ascending: false })
      .limit(1);
    
    finalSortOrder = existingTechs && existingTechs.length > 0 ? existingTechs[0].sort_order + 1 : 0;
  }

  const { data, error } = await supabase
    .from("dev_technologies")
    .insert({
      project_id,
      name,
      icon_slug,
      version,
      category,
      description,
      sort_order: finalSortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(project_id, 'technology_added', 'technology', data?.id, { name, category });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev technologies disabled - contact administrator" },
      { status: 503 }
    );
  }

  const body: UpdateTechnologyData & { id?: number } = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Get the technology to check project_id and permissions
  const { data: tech } = await supabase
    .from("dev_technologies")
    .select("project_id, name")
    .eq("id", id)
    .single();

  if (!tech) {
    return NextResponse.json({ error: "Technology not found" }, { status: 404 });
  }

  // Check if user has permission to manage technologies
  const permissionCheck = await checkProjectPermission(tech.project_id, 'manage_technologies');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  // SECURITY: whitelist instead of spreading the rest of the request body --
  // the permission check above only verified access to this tech's *current*
  // project_id, but the body's own project_id (a real column on this table)
  // would otherwise pass straight through and let a member move it into a
  // project they have no access to.
  const ALLOWED_FIELDS = ['name', 'icon_slug', 'version', 'category', 'description', 'sort_order'] as const;
  const updateData: UpdateTechnologyData = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) (updateData as any)[field] = (body as any)[field];
  }

  const { data, error } = await supabase
    .from("dev_technologies")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(tech.project_id, 'technology_updated', 'technology', id, { name: tech.name });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev technologies disabled - contact administrator" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Get the technology to check project_id and permissions
  const { data: tech } = await supabase
    .from("dev_technologies")
    .select("project_id, name")
    .eq("id", Number(id))
    .single();

  if (!tech) {
    return NextResponse.json({ error: "Technology not found" }, { status: 404 });
  }

  // Check if user has permission to manage technologies
  const permissionCheck = await checkProjectPermission(tech.project_id, 'manage_technologies');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await supabase
    .from("dev_technologies")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(tech.project_id, 'technology_deleted', 'technology', Number(id), { name: tech.name });

  return NextResponse.json({ success: true });
}
