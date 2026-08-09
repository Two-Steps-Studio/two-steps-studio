import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { createApiKey, listApiKeys, maskApiKey } from "@/lib/api-auth";
import { apiSuccess, apiBadRequest, apiUnauthorized, apiInternalError } from "@/lib/api-response";
import type { ApiScope, ApiKeyType } from "@/lib/api-auth";

/**
 * GET /api/user/api-keys
 * List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  
  if (auth instanceof NextResponse) {
    return auth;
  }

  const result = await listApiKeys(auth.user.id);
  
  if (result instanceof NextResponse) {
    return result;
  }

  // Mask API keys for security (never return full keys)
  const maskedKeys = result.map(key => ({
    ...key,
    key_id: maskApiKey(key.key_id),
  }));

  return apiSuccess(maskedKeys);
}

/**
 * POST /api/user/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const body = await request.json();
    const { name, key_type = 'live', scopes = [], description, expires_at } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiBadRequest("API key name is required");
    }

    // Validate key type
    if (!['live', 'test'].includes(key_type)) {
      return apiBadRequest("Invalid key type. Must be 'live' or 'test'");
    }

    // Validate scopes
    const validScopes: ApiScope[] = [
      'projects:read', 'projects:write',
      'tasks:read', 'tasks:write',
      'files:read', 'files:write',
      'roadmap:read', 'roadmap:write',
      'games:read', 'games:write',
      'music:read', 'music:write',
      'podcasts:read', 'podcasts:write',
      'users:read', 'profile:read',
      'analytics:read',
      'settings:read', 'settings:write'
    ];

    const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope as ApiScope));
    if (invalidScopes.length > 0) {
      return apiBadRequest(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Validate expiration date
    let expiresAt: Date | undefined;
    if (expires_at) {
      expiresAt = new Date(expires_at);
      if (isNaN(expiresAt.getTime())) {
        return apiBadRequest("Invalid expiration date");
      }
      if (expiresAt <= new Date()) {
        return apiBadRequest("Expiration date must be in the future");
      }
    }

    // Create API key
    const result = await createApiKey(
      auth.user.id,
      name.trim(),
      key_type as ApiKeyType,
      scopes as ApiScope[],
      description?.trim(),
      expiresAt
    );

    if (result instanceof NextResponse) {
      return result;
    }

    // Return the full API key (only shown once)
    return apiSuccess({
      apiKey: result.apiKey,
      keyData: {
        ...result.keyData,
        key_id: maskApiKey(result.keyData.key_id), // Mask in response
      }
    }, 201);

  } catch (error) {
    return apiInternalError(error instanceof Error ? error.message : "Failed to create API key");
  }
}
