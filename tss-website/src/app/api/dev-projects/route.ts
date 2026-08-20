import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { CreateProjectData, UpdateProjectData, DevProject } from "@/lib/types/dev-types";
import { logActivity } from "@/lib/dev-permissions";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev projects disabled - contact administrator" },
      { status: 503 }
    );
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  // Get projects where user is owner or member - use two separate queries to avoid .or() issues
  const [ownerProjectsResult, memberProjectsResult] = await Promise.all([
    supabase
      .from("dev_projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("dev_projects")
      .select(`
        *,
        dev_project_members!inner(
          user_id,
          role,
          permissions
        )
      `)
      .eq("dev_project_members.user_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  if (ownerProjectsResult.error || memberProjectsResult.error) {
    return NextResponse.json({ 
      error: ownerProjectsResult.error?.message || memberProjectsResult.error?.message 
    }, { status: 500 });
  }

  // Combine results, removing duplicates (owner projects take precedence)
  const ownerProjectIds = new Set(ownerProjectsResult.data?.map(p => p.id) || []);
  const memberProjects = (memberProjectsResult.data || []).filter(
    p => !ownerProjectIds.has(p.id)
  );

  let allProjects = [...(ownerProjectsResult.data || []), ...memberProjects];

  if (!includeArchived) {
    allProjects = allProjects.filter(p => p.status === "active");
  }

  const data = allProjects;

  // Transform data to include user's role and permissions
  const projects = (data || []).map((project: any) => {
    const isOwner = project.owner_id === user.id;
    const member = project.dev_project_members?.[0];
    return {
      ...project,
      dev_project_members: undefined,
      user_role: isOwner ? 'owner' : member?.role || 'viewer',
      user_permissions: isOwner
        ? {
            view_project: true,
            edit_project: true,
            manage_tasks: true,
            manage_roadmap: true,
            manage_files: true,
            manage_description: true,
            manage_technologies: true,
            manage_members: true,
            delete_project: true
          }
        : member?.permissions || null
    };
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev projects disabled - contact administrator" },
      { status: 503 }
    );
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateProjectData = await request.json();
  const { name, description, description_markdown, color, project_type, planned_end_date } = body;

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID — user.id never matches the real row for a
  // Discord-linked account. (dev_projects.owner_id below is a separate,
  // self-consistent key space keyed by the auth UUID; leave that alone.)
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Check user's project limits
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("project_limit, joined_projects_limit")
    .eq("id", discordId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }

  const projectLimit = profile.project_limit || 1;

  // Count current own projects
  const { count: ownProjectsCount, error: countError } = await supabase
    .from("dev_projects")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return NextResponse.json({ error: "Failed to count projects" }, { status: 500 });
  }

  if (ownProjectsCount && ownProjectsCount >= projectLimit) {
    return NextResponse.json(
      {
        error: "Project limit reached",
        message: `You have reached your limit of ${projectLimit} own project(s). Upgrade your subscription to create more projects.`
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("dev_projects")
    .insert({
      owner_id: user.id,
      name,
      description,
      description_markdown,
      color: color || "#ffcb2f",
      project_type: project_type || "general",
      status: "active",
      planned_end_date,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await logActivity(data.id, 'project_created', 'project', data.id, { name });

  return NextResponse.json(data, { status: 201 });
}
