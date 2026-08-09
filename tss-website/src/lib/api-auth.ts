import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-server";
import crypto from "crypto";

// ============================================
// TYPES
// ============================================

export type ApiKeyType = 'live' | 'test';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export type ApiScope = 
  | 'projects:read'
  | 'projects:write'
  | 'tasks:read'
  | 'tasks:write'
  | 'files:read'
  | 'files:write'
  | 'roadmap:read'
  | 'roadmap:write'
  | 'games:read'
  | 'games:write'
  | 'music:read'
  | 'music:write'
  | 'podcasts:read'
  | 'podcasts:write'
  | 'users:read'
  | 'profile:read'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:write';

export interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  key_type: ApiKeyType;
  status: ApiKeyStatus;
  scopes: ApiScope[];
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiAuthContext {
  apiKey: ApiKey;
  userId: string;
  scopes: ApiScope[];
  keyType: ApiKeyType;
}

export interface ApiRequestLog {
  api_key_id: number;
  user_id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms?: number;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
}

// ============================================
// ERROR RESPONSES
// ============================================

const API_ERROR_RESPONSES = {
  UNAUTHORIZED: NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" } },
    { status: 401 }
  ),
  FORBIDDEN: NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Access denied" } },
    { status: 403 }
  ),
  INSUFFICIENT_SCOPE: (required: string) => NextResponse.json(
    { error: { code: "INSUFFICIENT_SCOPE", message: `This API key does not have the required permission: ${required}` } },
    { status: 403 }
  ),
  KEY_REVOKED: NextResponse.json(
    { error: { code: "KEY_REVOKED", message: "This API key has been revoked" } },
    { status: 401 }
  ),
  KEY_EXPIRED: NextResponse.json(
    { error: { code: "KEY_EXPIRED", message: "This API key has expired" } },
    { status: 401 }
  ),
  RATE_LIMIT_EXCEEDED: (retryAfter: number) => NextResponse.json(
    { error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" } },
    { status: 429, headers: { "Retry-After": retryAfter.toString() } }
  ),
};

// ============================================
// API KEY GENERATION
// ============================================

/**
 * Generate a secure API key
 * Format: tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 random chars)
 */
export function generateApiKey(keyType: ApiKeyType = 'live'): string {
  const randomBytes = crypto.randomBytes(24);
  const randomString = randomBytes
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
  
  return `tss_${keyType}_${randomString}`;
}

/**
 * Hash an API key using SHA-256 (for storage comparison)
 * Note: In production, consider using bcrypt or argon2
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract key_id from API key (the public identifier part)
 * Format: tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 * Returns: tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (same as input for lookup)
 */
export function extractKeyId(apiKey: string): string {
  // The key_id is the full API key (we hash it for storage)
  // This allows us to look up by the full key and verify the hash
  return apiKey;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const regex = /^tss_(live|test)_[a-zA-Z0-9]{32}$/;
  return regex.test(apiKey);
}

// ============================================
// API KEY AUTHENTICATION
// ============================================

/**
 * Extract API key from request headers
 * Supports both Authorization: Bearer <key> and X-API-Key: <key>
 */
export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  
  // Prefer Authorization: Bearer header
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback to X-API-Key header
  if (xApiKey) {
    return xApiKey;
  }
  
  return null;
}

/**
 * Authenticate API key and return auth context
 * This is the main authentication function for API v1 endpoints
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthContext | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_DISABLED", message: "API service unavailable" } },
      { status: 503 }
    );
  }

  // Extract API key from request
  const apiKey = extractApiKeyFromRequest(request);
  if (!apiKey) {
    return API_ERROR_RESPONSES.UNAUTHORIZED;
  }

  // Validate API key format
  if (!isValidApiKeyFormat(apiKey)) {
    return API_ERROR_RESPONSES.UNAUTHORIZED;
  }

  // Hash the API key for lookup
  const apiKeyHash = hashApiKey(apiKey);

  // Look up API key in database
  const { data: apiKeyData, error: apiKeyError } = await supabase
    .from("api_keys")
    select("*")
    .eq("key_hash", apiKeyHash)
    .single();

  if (apiKeyError || !apiKeyData) {
    return API_ERROR_RESPONSES.UNAUTHORIZED;
  }

  // Check if key is revoked
  if (apiKeyData.status === 'revoked') {
    return API_ERROR_RESPONSES.KEY_REVOKED;
  }

  // Check if key is expired
  if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
    return API_ERROR_RESPONSES.KEY_EXPIRED;
  }

  // Update last_used_at timestamp
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyData.id);

  // Return auth context
  return {
    apiKey: apiKeyData,
    userId: apiKeyData.owner_id,
    scopes: apiKeyData.scopes as ApiScope[],
    keyType: apiKeyData.key_type,
  };
}

/**
 * Check if auth context has required scope
 */
export function hasScope(auth: ApiAuthContext | NextResponse, requiredScope: ApiScope): boolean {
  if (auth instanceof NextResponse) {
    return false;
  }
  return auth.scopes.includes(requiredScope);
}

/**
 * Require specific scope - returns error response if scope is missing
 */
export function requireScope(auth: ApiAuthContext | NextResponse, requiredScope: ApiScope): NextResponse | null {
  if (auth instanceof NextResponse) {
    return auth;
  }
  
  if (!hasScope(auth, requiredScope)) {
    return API_ERROR_RESPONSES.INSUFFICIENT_SCOPE(requiredScope);
  }
  
  return null;
}

/**
 * Require any of the specified scopes
 */
export function requireAnyScope(auth: ApiAuthContext | NextResponse, requiredScopes: ApiScope[]): NextResponse | null {
  if (auth instanceof NextResponse) {
    return auth;
  }
  
  const hasAnyScope = requiredScopes.some(scope => auth.scopes.includes(scope));
  
  if (!hasAnyScope) {
    return API_ERROR_RESPONSES.INSUFFICIENT_SCOPE(requiredScopes.join(" or "));
  }
  
  return null;
}

// ============================================
// API KEY MANAGEMENT (for UI)
// ============================================

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  keyType: ApiKeyType = 'live',
  scopes: ApiScope[] = [],
  description?: string,
  expiresAt?: Date
): Promise<{ apiKey: string; keyData: ApiKey } | NextResponse> {
  const serviceClient = createServiceClient();
  
  // Generate API key
  const fullApiKey = generateApiKey(keyType);
  const apiKeyHash = hashApiKey(fullApiKey);
  
  // Insert into database
  const { data: keyData, error } = await serviceClient
    .from("api_keys")
    .insert({
      key_id: fullApiKey, // Store full key as key_id for now (will be used for lookup)
      key_hash: apiKeyHash,
      name,
      description,
      owner_id: userId,
      key_type: keyType,
      status: 'active',
      scopes,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CREATION_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  // Return the full API key (only shown once)
  return {
    apiKey: fullApiKey,
    keyData: keyData as ApiKey,
  };
}

/**
 * List API keys for a user
 */
export async function listApiKeys(userId: string): Promise<ApiKey[] | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_DISABLED", message: "API service unavailable" } },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return (data || []) as ApiKey[];
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<ApiKey | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_DISABLED", message: "API service unavailable" } },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .update({ status: 'revoked' })
    .eq("id", parseInt(keyId))
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "REVOKE_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return data as ApiKey;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(userId: string, keyId: string): Promise<void | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_DISABLED", message: "API service unavailable" } },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", parseInt(keyId))
    .eq("owner_id", userId);

  if (error) {
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log an API request for audit purposes
 */
export async function logApiRequest(log: ApiRequestLog): Promise<void> {
  const serviceClient = createServiceClient();
  
  try {
    await serviceClient.rpc('log_api_request', {
      p_api_key_id: log.api_key_id,
      p_user_id: log.user_id,
      p_method: log.method,
      p_endpoint: log.endpoint,
      p_status_code: log.status_code,
      p_response_time_ms: log.response_time_ms,
      p_ip_address: log.ip_address,
      p_user_agent: log.user_agent,
      p_error_message: log.error_message,
    });
  } catch (error) {
    // Log failures but don't block the request
    console.error("[API-AUTH] Failed to log API request:", error);
  }
}

/**
 * Get API request logs for a user
 */
export async function getApiRequestLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[] | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_DISABLED", message: "API service unavailable" } },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("api_request_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return data || [];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if auth result is an error response
 */
export function isApiAuthError(auth: ApiAuthContext | NextResponse): auth is NextResponse {
  return auth instanceof NextResponse;
}

/**
 * Safely extract user ID from auth context
 */
export function getApiUserId(auth: ApiAuthContext | NextResponse): string | null {
  if (isApiAuthError(auth)) return null;
  return auth.userId;
}

/**
 * Safely extract API key from auth context
 */
export function getApiKey(auth: ApiAuthContext | NextResponse): ApiKey | null {
  if (isApiAuthError(auth)) return null;
  return auth.apiKey;
}

/**
 * Mask API key for display (show first 8 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 12) return "***";
  const prefix = apiKey.substring(0, 12);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^localhost$/;
    if (ipRegex.test(ip)) {
      return ip;
    }
  }
  return "unknown";
}
