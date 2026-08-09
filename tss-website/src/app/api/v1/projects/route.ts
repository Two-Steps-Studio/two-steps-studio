import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { authenticateApiKey, requireScope, getApiUserId, logApiRequest, getClientIp } from "@/lib/api-auth";
import { rateLimitByApiKey } from "@/lib/api-rate-limit";
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiNotFound, apiInternalError, getPaginationParams } from "@/lib/api-response";
import type { DevProject } from "@/lib/types/dev-types";

/**
 * GET /api/v1/projects
 * List all projects accessible to the API key owner
 * Requires: projects:read scope
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const auth = await authenticateApiKey(request);
  
  // Check authentication
  if (auth instanceof NextResponse) {
    await logApiRequest({
      api_key_id: 0,
      user_id: "unknown",
      method: "GET",
      endpoint: "/api/v1/projects",
      status_code: auth.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return auth;
  }

  // Check rate limit
  const rateLimitCheck = await rateLimitByApiKey(auth.apiKey.id, auth.keyType);
  if (rateLimitCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/projects",
      status_code: rateLimitCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return rateLimitCheck;
  }

  // Check scope
  const scopeCheck = requireScope(auth, "projects:read");
  if (scopeCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/projects",
      status_code: scopeCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return scopeCheck;
  }

  const userId = getApiUserId(auth);
  if (!userId) {
    return apiUnauthorized();
  }

  // Get pagination parameters
  const { searchParams } = new URL(request.url);
  const pagination = getPaginationParams(searchParams);

  try {
    const supabase = await createClient();

    // Get projects where user is owner or member
    const [ownerProjectsResult, memberProjectsResult] = await Promise.all([
      supabase
        .from("dev_projects")
        .select("*")
        .eq("owner_id", userId)
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
        .eq("dev_project_members.user_id", userId)
        .order("created_at", { ascending: false })
    ]);

    if (ownerProjectsResult.error || memberProjectsResult.error) {
      const error = ownerProjectsResult.error || memberProjectsResult.error;
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "GET",
        endpoint: "/api/v1/projects",
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: error?.message,
      });
      return apiInternalError(error?.message);
    }

    // Combine results, removing duplicates (owner projects take precedence)
    const ownerProjectIds = new Set(ownerProjectsResult.data?.map(p => p.id) || []);
    const memberProjects = (memberProjectsResult.data || []).filter(
      p => !ownerProjectIds.has(p.id)
    );

    let allProjects = [...(ownerProjectsResult.data || []), ...memberProjects];

    // Filter out archived projects unless explicitly requested
    const includeArchived = searchParams.get("includeArchived") === "true";
    if (!includeArchived) {
      allProjects = allProjects.filter(p => p.status === "active");
    }

    // Apply pagination
    const total = allProjects.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedProjects = allProjects.slice(offset, offset + pagination.limit);

    // Transform data to include user's role and permissions
    const projects = paginatedProjects.map((project: any) => {
      const isOwner = project.owner_id === userId;
      const member = project.dev_project_members?.[0];
      return {
        id: project.id,
        owner_id: project.owner_id,
        name: project.name,
        description: project.description,
        description_markdown: project.description_markdown,
        color: project.color,
        status: project.status,
        project_type: project.project_type,
        planned_end_date: project.planned_end_date,
        is_archived: project.is_archived,
        created_at: project.created_at,
        updated_at: project.updated_at,
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

    // Log successful request
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/projects",
      status_code: 200,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return apiPaginated(projects, pagination.page, pagination.limit, total);

  } catch (error) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/projects",
      status_code: 500,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    return apiInternalError();
  }
}

/**
 * POST /api/v1/projects
 * Create a new project
 * Requires: projects:write scope
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const auth = await authenticateApiKey(request);
  
  // Check authentication
  if (auth instanceof NextResponse) {
    await logApiRequest({
      api_key_id: 0,
      user_id: "unknown",
      method: "POST",
      endpoint: "/api/v1/projects",
      status_code: auth.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return auth;
  }

  // Check rate limit
  const rateLimitCheck = await rateLimitByApiKey(auth.apiKey.id, auth.keyType);
  if (rateLimitCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "POST",
      endpoint: "/api/v1/projects",
      status_code: rateLimitCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return rateLimitCheck;
  }

  // Check scope
  const scopeCheck = requireScope(auth, "projects:write");
  if (scopeCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "POST",
      endpoint: "/api/v1/projects",
      status_code: scopeCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return scopeCheck;
  }

  const userId = getApiUserId(auth);
  if (!userId) {
    return apiUnauthorized();
  }

  try {
    const body = await request.json();
    const { name, description, description_markdown, color, project_type, planned_end_date } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiBadRequest("Project name is required");
    }

    const supabase = await createClient();

    // Check user's project limits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("project_limit")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/projects",
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Failed to fetch user profile",
      });
      return apiInternalError("Failed to fetch user profile");
    }

    const projectLimit = profile.project_limit || 1;

    // Count current own projects
    const { count: ownProjectsCount, error: countError } = await supabase
      .from("dev_projects")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId);

    if (countError) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/projects",
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Failed to count projects",
      });
      return apiInternalError("Failed to count projects");
    }

    if (ownProjectsCount && ownProjectsCount >= projectLimit) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/projects",
        status_code: 400,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Project limit reached",
      });
      return apiBadRequest(
        `Project limit reached. You can create up to ${projectLimit} project(s).`
      );
    }

    // Create project
    const { data, error } = await supabase
      .from("dev_projects")
      .insert({
        owner_id: userId,
        name: name.trim(),
        description: description?.trim(),
        description_markdown: description_markdown?.trim(),
        color: color || "#ffcb2f",
        project_type: project_type || "general",
        status: "active",
        planned_end_date,
      })
      .select()
      .single();

    if (error) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/projects",
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: error.message,
      });
      return apiInternalError(error.message);
    }

    // Log successful request
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "POST",
      endpoint: "/api/v1/projects",
      status_code: 201,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return apiSuccess(data, 201);

  } catch (error) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "POST",
      endpoint: "/api/v1/projects",
      status_code: 500,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    return apiInternalError();
  }
}
