import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { DevActivityLog } from "@/lib/types/dev-types";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Dev module disabled - contact administrator" },
      { status: 503 }
    );
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  // Check if user has access to the project
  const { data: project, error: projectError } = await supabase
    .from("dev_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isOwner = project.owner_id === user.id;
  let isMember = false;
  if (!isOwner) {
    // A Supabase query result is an object ({data, error}) even when no row
    // matched, so the old `hasAccess = isOwner || await supabase...single()`
    // was always truthy here -- the Forbidden check below never fired for
    // non-owners, letting any authenticated user read any project's
    // activity log. Check the actual returned row instead of the query object.
    const { data: membership } = await supabase
      .from("dev_project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();
    isMember = !!membership;
  }

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get activity logs
  const { data: logs, error: logsError } = await supabase
    .from("dev_activity_logs")
    .select(`
      *,
      profiles!inner(
        id,
        username,
        avatar_url
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  // Transform data
  const transformedLogs = (logs || []).map((log: any) => ({
    ...log,
    profiles: undefined,
    username: log.profiles?.username,
    avatar_url: log.profiles?.avatar_url,
  }));

  // Get total count
  const { count } = await supabase
    .from("dev_activity_logs")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  return NextResponse.json({
    logs: transformedLogs,
    total: count || 0,
    limit,
    offset,
  });
}
