import { NextResponse } from "next/server";

// ============================================
// STANDARD API RESPONSE FORMATS
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ============================================
// SUCCESS RESPONSES
// ============================================

/**
 * Standard success response with data
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data } as ApiResponse<T>, { status });
}

/**
 * Paginated success response
 */
export function apiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse {
  const hasMore = (page * limit) < total;
  return NextResponse.json(
    {
      data,
      meta: {
        page,
        limit,
        total,
        hasMore,
      },
    } as ApiResponse<T[]>,
    { status }
  );
}

/**
 * Created response (201)
 */
export function apiCreated<T>(data: T): NextResponse {
  return apiSuccess(data, 201);
}

/**
 * No content response (204)
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================
// ERROR RESPONSES
// ============================================

/**
 * Standard error response
 */
export function apiError(code: string, message: string, status: number = 500, details?: any): NextResponse {
  return NextResponse.json(
    { error: { code, message, details } } as ApiError,
    { status }
  );
}

/**
 * Bad request (400)
 */
export function apiBadRequest(message: string, details?: any): NextResponse {
  return apiError("BAD_REQUEST", message, 400, details);
}

/**
 * Unauthorized (401)
 */
export function apiUnauthorized(message: string = "Unauthorized"): NextResponse {
  return apiError("UNAUTHORIZED", message, 401);
}

/**
 * Forbidden (403)
 */
export function apiForbidden(message: string = "Forbidden"): NextResponse {
  return apiError("FORBIDDEN", message, 403);
}

/**
 * Not found (404)
 */
export function apiNotFound(resource: string = "Resource"): NextResponse {
  return apiError("NOT_FOUND", `${resource} not found`, 404);
}

/**
 * Conflict (409)
 */
export function apiConflict(message: string): NextResponse {
  return apiError("CONFLICT", message, 409);
}

/**
 * Rate limit exceeded (429)
 */
export function apiRateLimitExceeded(retryAfter: number = 60): NextResponse {
  return NextResponse.json(
    { error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" } } as ApiError,
    { status: 429, headers: { "Retry-After": retryAfter.toString() } }
  );
}

/**
 * Internal server error (500)
 */
export function apiInternalError(message: string = "Internal server error"): NextResponse {
  return apiError("INTERNAL_ERROR", message, 500);
}

/**
 * Service unavailable (503)
 */
export function apiServiceUnavailable(message: string = "Service unavailable"): NextResponse {
  return apiError("SERVICE_UNAVAILABLE", message, 503);
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Extract and validate pagination parameters from URL
 */
export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  return { page, limit };
}

/**
 * Calculate offset for pagination
 */
export function getPaginationOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page: number, limit: number): { valid: boolean; error?: string } {
  if (page < 1) {
    return { valid: false, error: "Page must be greater than 0" };
  }
  if (limit < 1) {
    return { valid: false, error: "Limit must be greater than 0" };
  }
  if (limit > 100) {
    return { valid: false, error: "Limit cannot exceed 100" };
  }
  return { valid: true };
}
