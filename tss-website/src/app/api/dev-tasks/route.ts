import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { checkProjectPermission, checkProjectMembership, logActivity } from "@/lib/dev-permissions";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev tasks disabled - contact administrator" },
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
    .from("dev_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", Number(projectId));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return empty array if no tasks exist (handles PGRST116 case)
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev tasks disabled - contact administrator" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { project_id, title, description, tags, due_date, assignee_name, estimated_hours, progress_percent, priority = "medium", status = "todo" } = body;

  // Check if user has permission to manage tasks
  const permissionCheck = await checkProjectPermission(project_id, 'manage_tasks');
  if (!permissionCheck.hasAccess) {
    return NextResponse.json({ error: permissionCheck.error || "Insufficient permissions" }, { status: 403 });
  }

  // dev_tasks.id is a SERIAL (int4, max ~2.1 billion) - a manually supplied
  // Date.now() (13 digits, ~1.7 trillion today) always overflowed it and
  // errored out, so this insert previously always failed and fell through
  // to a silent retry, which also never called logActivity(). Let the DB
  // generate the id like the rest of the app already relies on.
  const { data, error } = await supabase.from("dev_tasks").insert({
    project_id,
    title,
    description,
    status,
    priority,
    tags,
    due_date,
    assignee_name,
    estimated_hours,
    progress_percent,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message || "Task creation failed" }, { status: 500 });
  }

  // Log activity
  await logActivity(project_id, 'task_created', 'task', data?.id, { title });

  return NextResponse.json(data, { status: 201 });
}
