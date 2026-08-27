import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { User } from "@supabase/supabase-js";

// ============================================
// TYPES
// ============================================

export type GlobalRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface AuthContext {
  user: User;
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    settings?: {
      isAdmin?: boolean;
    };
    rank?: string;
  };
  roles: GlobalRole[];
}

export interface OwnershipCheck {
  resourceType: 'game' | 'music_track' | 'podcast' | 'dev_project';
  resourceId: number;
}

// ============================================
// ERROR RESPONSES
// ============================================

// Factories, not pre-built Response objects: a Response body can only be
// read once. Building these at module load meant one shared instance was
// reused across every request for the lifetime of the server process — the
// first 401/403/503 anywhere in the app consumed its body, and every
// subsequent one (even on a completely different route) shipped an empty
// body with a `Content-Type: application/json` header, which callers doing
// `res.json()` saw as "Unexpected end of JSON input".
const ERROR_RESPONSES = {
  UNAUTHORIZED: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  FORBIDDEN: () => NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  SERVICE_DISABLED: () => NextResponse.json({ error: "Service disabled" }, { status: 503 }),
};

// ============================================
// 1. requireAuth()
// ============================================

/**
 * Checks if user is authenticated and returns AuthContext
 * @returns AuthContext or NextResponse with 401 error
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return ERROR_RESPONSES.SERVICE_DISABLED();
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return ERROR_RESPONSES.UNAUTHORIZED();
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID — user.id never matched the real row for a
  // Discord-linked account, so `profile` here was always null and
  // requireAdmin() silently rejected every real admin.
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, settings, rank, discord_roles")
    .eq("id", discordId)
    .maybeSingle();

  // Determine user roles. The 'OWNER' GlobalRole existed in the type/
  // hierarchy above and requireAdmin() already checked for it, but nothing
  // ever actually granted it — the real Discord "Owner"/"Owner Records"
  // role (the same ones DiscordRolesPanel badges on the profile page) didn't
  // translate into any elevated access here, only the separate manually-set
  // profiles.settings.isAdmin flag did.
  //
  // Live role strings aren't the clean "〔 👑︱Owner 〕" key alone - e.g.
  // "〔 👑︱Owner 〕//" - the bot/Discord side appends things like a
  // trailing "//". An exact-string match against the bare key silently
  // matched nothing. DiscordRolesPanel.tsx's findRole() already solves this
  // by extracting just the text between "︱" and "〕" and comparing that -
  // mirroring the same approach here instead of inventing a second, looser
  // one.
  const OWNER_ROLE_LABELS = new Set(["owner", "owner records"]);
  const discordRoles: string[] = Array.isArray((profile as any)?.discord_roles) ? (profile as any).discord_roles : [];
  const hasOwnerDiscordRole = discordRoles.some((r) => {
    const match = r.match(/︱\s*(.+?)\s*〕/);
    const inner = match?.[1]?.trim().toLowerCase();
    return !!inner && OWNER_ROLE_LABELS.has(inner);
  });

  const roles: GlobalRole[] = [];

  if (hasOwnerDiscordRole) {
    roles.push('OWNER');
  } else if (profile?.settings?.isAdmin === true) {
    roles.push('ADMIN');
  } else {
    roles.push('USER');
  }

  // TODO: In future, fetch from user_roles table instead of settings.isAdmin

  return {
    user,
    profile: profile || undefined,
    roles,
  };
}

// ============================================
// 2. requireRole()
// ============================================

/**
 * Checks if user has required role
 * @param auth - AuthContext from requireAuth()
 * @param requiredRole - Required role (OWNER, ADMIN, MODERATOR, USER)
 * @returns NextResponse with 403 if user doesn't have role, null if authorized
 */
export function requireRole(auth: AuthContext | NextResponse, requiredRole: GlobalRole): NextResponse | null {
  // If auth is an error response, return it
  if (auth instanceof NextResponse) {
    return auth;
  }

  // Role hierarchy: OWNER > ADMIN > MODERATOR > USER
  const ROLE_HIERARCHY: Record<GlobalRole, number> = {
    'OWNER': 4,
    'ADMIN': 3,
    'MODERATOR': 2,
    'USER': 1,
  };

  const userRoleLevel = Math.max(...auth.roles.map(role => ROLE_HIERARCHY[role] || 0));
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    console.error(`[SECURITY] User ${auth.user.id} attempted to access ${requiredRole} resource with roles:`, auth.roles);
    return ERROR_RESPONSES.FORBIDDEN();
  }

  return null;
}

// ============================================
// 3. requireAdmin()
// ============================================

/**
 * Shortcut to check if user is OWNER or ADMIN
 * @param auth - AuthContext from requireAuth()
 * @returns NextResponse with 403 if not admin, null if authorized
 */
export function requireAdmin(auth: AuthContext | NextResponse): NextResponse | null {
  // If auth is an error response, return it
  if (auth instanceof NextResponse) {
    return auth;
  }

  // Check if user has ADMIN or OWNER role
  if (!auth.roles.includes('ADMIN') && !auth.roles.includes('OWNER')) {
    console.error(`[SECURITY] User ${auth.user.id} attempted to access admin resource with roles:`, auth.roles);
    return ERROR_RESPONSES.FORBIDDEN();
  }

  return null;
}

// ============================================
// 4. requireOwnership()
// ============================================

/**
 * Checks if user is owner of a resource
 * @param auth - AuthContext from requireAuth()
 * @param resourceType - Type of resource (game, music_track, podcast, dev_project)
 * @param resourceId - ID of the resource
 * @returns NextResponse with 403 if not owner, null if authorized
 */
export async function requireOwnership(
  auth: AuthContext | NextResponse,
  resourceType: OwnershipCheck['resourceType'],
  resourceId: number
): Promise<NextResponse | null> {
  // If auth is an error response, return it
  if (auth instanceof NextResponse) {
    return auth;
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return ERROR_RESPONSES.SERVICE_DISABLED();
  }

  // Map resource types to Supabase tables
  const RESOURCE_TABLES: Record<OwnershipCheck['resourceType'], string> = {
    'game': 'games',
    'music_track': 'music_tracks',
    'podcast': 'podcasts',
    'dev_project': 'dev_projects',
  };

  const tableName = RESOURCE_TABLES[resourceType];
  if (!tableName) {
    console.error(`[SECURITY] Unknown resource type: ${resourceType}`);
    return ERROR_RESPONSES.FORBIDDEN();
  }

  const { data: resource } = await supabase
    .from(tableName)
    .select("owner_id")
    .eq("id", resourceId)
    .single();

  const isOwner = resource?.owner_id === auth.user.id;

  if (!isOwner) {
    console.error(`[SECURITY] User ${auth.user.id} attempted to access ${resourceType} ${resourceId} without ownership`);
    return ERROR_RESPONSES.FORBIDDEN();
  }

  return null;
}

// ============================================
// 5. requireProjectAccess()
// ============================================

/**
 * Checks if user has access to a DEV project with required permission
 * Integrates with existing DEV permission system
 * @param auth - AuthContext from requireAuth()
 * @param projectId - ID of the project
 * @param permission - Required permission (view_project, edit_project, manage_tasks, etc.)
 * @returns NextResponse with 403 if no access, null if authorized
 */
export async function requireProjectAccess(
  auth: AuthContext | NextResponse,
  projectId: number,
  permission: string
): Promise<NextResponse | null> {
  // If auth is an error response, return it
  if (auth instanceof NextResponse) {
    return auth;
  }

  // Import existing DEV permission system
  const { checkProjectPermission } = await import("@/lib/dev-permissions");
  
  const result = await checkProjectPermission(projectId, permission as any);
  
  if (!result.hasAccess) {
    console.error(`[SECURITY] User ${auth.user.id} attempted to access project ${projectId} with permission ${permission}:`, result.error);
    return NextResponse.json({ error: result.error || "Forbidden" }, { status: 403 });
  }

  return null;
}

// ============================================
// 6. validateInput()
// ============================================

/**
 * Validates input data against a schema
 * Currently performs basic validation, prepared for Zod integration
 * @param schema - Validation schema (object with field types)
 * @param data - Data to validate
 * @returns Validated data or NextResponse with 400 error
 */
export function validateInput<T extends Record<string, any>>(
  schema: Record<keyof T, 'string' | 'number' | 'boolean' | 'email' | 'url'>,
  data: any
): { data: T } | NextResponse {
  const errors: string[] = [];
  const validated: any = {};

  for (const [field, type] of Object.entries(schema)) {
    const value = data[field];

    if (value === undefined || value === null) {
      errors.push(`${field} is required`);
      continue;
    }

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        } else {
          validated[field] = value;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a number`);
        } else {
          validated[field] = value;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        } else {
          validated[field] = value;
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        } else {
          validated[field] = value;
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
          errors.push(`${field} must be a valid URL`);
        } else {
          validated[field] = value;
        }
        break;

      default:
        errors.push(`${field} has unknown type`);
    }
  }

  if (errors.length > 0) {
    console.error(`[SECURITY] Input validation failed:`, errors);
    return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 });
  }

  return { data: validated as T };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Checks if auth result is an error response
 */
export function isAuthError(auth: AuthContext | NextResponse): auth is NextResponse {
  return auth instanceof NextResponse;
}

/**
 * Safely extracts user from auth context
 */
export function getUser(auth: AuthContext | NextResponse): User | null {
  if (isAuthError(auth)) return null;
  return auth.user;
}

/**
 * Safely extracts user ID from auth context
 */
export function getUserId(auth: AuthContext | NextResponse): string | null {
  const user = getUser(auth);
  return user?.id || null;
}
