import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { authenticateApiKey, requireScope, getApiUserId, logApiRequest, getClientIp } from "@/lib/api-auth";
import { rateLimitByApiKey } from "@/lib/api-rate-limit";
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiNotFound, apiInternalError, getPaginationParams } from "@/lib/api-response";
import type { DevTask } from "@/lib/types/dev-types";

/**
 * GET /api/v1/tasks
 * List tasks for a project
 * Requires: tasks:read scope
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
      endpoint: "/api/v1/tasks",
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
      endpoint: "/api/v1/tasks",
      status_code: rateLimitCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return rateLimitCheck;
  }

  // Check scope
  const scopeCheck = requireScope(auth, "tasks:read");
  if (scopeCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/tasks",
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

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const pagination = getPaginationParams(searchParams);

  if (!projectId) {
    return apiBadRequest("Project ID is required");
  }

  try {
    // Requests here carry an Authorization: Bearer <api key> header, not a
    // browser session - there are no cookies for the session-bound client
    // to read, so it always ran as the fully unauthenticated anon role and
    // any RLS on dev_projects/dev_tasks would silently block every read and
    // write. The isOwner/member checks below are the real authorization
    // gate for this key's resolved userId, same as the admin/webhook routes.
    const supabase = createServiceClient();

    // Check if user has access to the project
    const { data: project, error: projectError } = await supabase
      .from("dev_projects")
      .select("id, owner_id")
      .eq("id", parseInt(projectId))
      .single();

    if (projectError || !project) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "GET",
        endpoint: "/api/v1/tasks",
        status_code: 404,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Project not found",
      });
      return apiNotFound("Project");
    }

    // Check if user is owner or member
    const isOwner = project.owner_id === userId;
    const { count: memberCount } = await supabase
      .from("dev_project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", parseInt(projectId))
      .eq("user_id", userId);

    if (!isOwner && (!memberCount || memberCount === 0)) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "GET",
        endpoint: "/api/v1/tasks",
        status_code: 403,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Access denied to project",
      });
      return apiForbidden("You don't have access to this project");
    }

    // Get tasks for the project
    let query = supabase
      .from("dev_tasks")
      .select("*")
      .eq("project_id", parseInt(projectId))
      .order("created_at", { ascending: false });

    // Apply filters
    const status = searchParams.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    const priority = searchParams.get("priority");
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: allTasks, error } = await query;

    if (error) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "GET",
        endpoint: "/api/v1/tasks",
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: error.message,
      });
      return apiInternalError(error.message);
    }

    // Apply pagination
    const tasks = allTasks || [];
    const total = tasks.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedTasks = tasks.slice(offset, offset + pagination.limit);

    // Log successful request
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/tasks",
      status_code: 200,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return apiPaginated(paginatedTasks, pagination.page, pagination.limit, total);

  } catch (error) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "GET",
      endpoint: "/api/v1/tasks",
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
 * POST /api/v1/tasks
 * Create a new task
 * Requires: tasks:write scope
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
      endpoint: "/api/v1/tasks",
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
      endpoint: "/api/v1/tasks",
      status_code: rateLimitCheck.status,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
    });
    return rateLimitCheck;
  }

  // Check scope
  const scopeCheck = requireScope(auth, "tasks:write");
  if (scopeCheck) {
    await logApiRequest({
      api_key_id: auth.apiKey.id,
      user_id: auth.userId,
      method: "POST",
      endpoint: "/api/v1/tasks",
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
    const { project_id, title, description, status, priority, tags, due_date, assignee_name, estimated_hours, progress_percent } = body;

    // Validate required fields
    if (!project_id || !title || typeof title !== 'string' || title.trim().length === 0) {
      return apiBadRequest("Project ID and title are required");
    }

    // See the GET handler above for why this needs the service-role client.
    const supabase = createServiceClient();

    // Check if user has access to the project
    const { data: project, error: projectError } = await supabase
      .from("dev_projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/tasks",
        status_code: 404,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Project not found",
      });
      return apiNotFound("Project");
    }

    // Check if user is owner or member with write permissions
    const isOwner = project.owner_id === userId;
    const { data: member } = await supabase
      .from("dev_project_members")
      .select("role, permissions")
      .eq("project_id", project_id)
      .eq("user_id", userId)
      .single();

    const canWrite = isOwner || (member && ['owner', 'admin', 'developer'].includes(member.role));

    if (!canWrite) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/tasks",
        status_code: 403,
        response_time_ms: Date.now() - startTime,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") || undefined,
        error_message: "Insufficient permissions to create tasks",
      });
      return apiForbidden("You don't have permission to create tasks in this project");
    }

    // Create task
    const { data, error } = await supabase
      .from("dev_tasks")
      .insert({
        project_id,
        title: title.trim(),
        description: description?.trim(),
        status: status || "todo",
        priority: priority || "medium",
        tags: tags || [],
        due_date,
        assignee_name,
        estimated_hours,
        progress_percent: progress_percent || 0,
      })
      .select()
      .single();

    if (error) {
      await logApiRequest({
        api_key_id: auth.apiKey.id,
        user_id: auth.userId,
        method: "POST",
        endpoint: "/api/v1/tasks",
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
      endpoint: "/api/v1/tasks",
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
      endpoint: "/api/v1/tasks",
      status_code: 500,
      response_time_ms: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent") || undefined,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    return apiInternalError();
  }
}
