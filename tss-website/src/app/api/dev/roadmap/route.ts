import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { CreatePhaseData, UpdatePhaseData, DevRoadmapPhase } from "@/lib/types/dev-types";
import { checkProjectPermission, checkProjectMembership, logActivity } from "@/lib/dev-permissions";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev roadmap disabled - contact administrator" },
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
    .from("dev_roadmap_phases")
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
      { error: "Dev roadmap disabled - contact administrator" },
      { status: 503 }
    );
  }

  const body: CreatePhaseData = await request.json();
  const { project_id, name, description, start_date, planned_end_date, status, completion_percentage, sort_order } = body;

  // Check if user has permission to manage roadmap
  const permissionCheck = await checkProjectPermission(project_id, 'manage_roadmap');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  // Get max sort_order for this project if not provided
  let finalSortOrder = sort_order;
  if (!finalSortOrder) {
    const { data: existingPhases } = await supabase
      .from("dev_roadmap_phases")
      .select("sort_order")
      .eq("project_id", project_id)
      .order("sort_order", { ascending: false })
      .limit(1);
    
    finalSortOrder = existingPhases && existingPhases.length > 0 ? existingPhases[0].sort_order + 1 : 0;
  }

  const { data, error } = await supabase
    .from("dev_roadmap_phases")
    .insert({
      project_id,
      name,
      description,
      start_date,
      planned_end_date,
      status: status || "planned",
      completion_percentage: completion_percentage || 0,
      sort_order: finalSortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(project_id, 'phase_created', 'roadmap_phase', data?.id, { name });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev roadmap disabled - contact administrator" },
      { status: 503 }
    );
  }

  const body: UpdatePhaseData & { id?: number } = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Get the phase to check project_id and permissions
  const { data: phase } = await supabase
    .from("dev_roadmap_phases")
    .select("project_id, name")
    .eq("id", id)
    .single();

  if (!phase) {
    return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  }

  // Check if user has permission to manage roadmap
  const permissionCheck = await checkProjectPermission(phase.project_id, 'manage_roadmap');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  // SECURITY: build the update from a whitelist instead of spreading the
  // rest of the request body -- the permission check above only verified
  // access to this phase's *current* project_id, but the body's own
  // project_id (a real column on this table) would otherwise pass straight
  // through and let a member move the phase into a project they have no
  // access to.
  const ALLOWED_FIELDS = ['name', 'description', 'start_date', 'planned_end_date', 'status', 'completion_percentage', 'sort_order'] as const;
  const updateData: UpdatePhaseData = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) (updateData as any)[field] = (body as any)[field];
  }

  const { data, error } = await supabase
    .from("dev_roadmap_phases")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(phase.project_id, 'phase_updated', 'roadmap_phase', id, { name: phase.name });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev roadmap disabled - contact administrator" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Get the phase to check project_id and permissions
  const { data: phase } = await supabase
    .from("dev_roadmap_phases")
    .select("project_id, name")
    .eq("id", Number(id))
    .single();

  if (!phase) {
    return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  }

  // Check if user has permission to manage roadmap
  const permissionCheck = await checkProjectPermission(phase.project_id, 'manage_roadmap');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await supabase
    .from("dev_roadmap_phases")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(phase.project_id, 'phase_deleted', 'roadmap_phase', Number(id), { name: phase.name });

  return NextResponse.json({ success: true });
}
