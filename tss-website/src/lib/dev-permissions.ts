import { createClient } from "@/lib/supabase-server";
import type { PermissionName, DevProjectRole } from "@/lib/types/dev-types";

export interface PermissionCheckResult {
  hasAccess: boolean;
  error?: string;
  userRole?: DevProjectRole;
}

/**
 * Check if user has permission to perform an action on a project
 */
export async function checkProjectPermission(
  projectId: number,
  permission: PermissionName
): Promise<PermissionCheckResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { hasAccess: false, error: "Dev module disabled" };
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { hasAccess: false, error: "Unauthorized" };
  }
  // dev_projects.owner_id (and dev_project_members.user_id below) store the
  // Discord snowflake (profiles.id), never the Supabase Auth UUID - the same
  // mismatch fixed repeatedly elsewhere this session. Comparing against bare
  // user.id meant the actual project owner never matched their own project
  // and fell through to "Not a member" / "Insufficient permissions".
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Check if user is owner
  const { data: project } = await supabase
    .from("dev_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { hasAccess: false, error: "Project not found" };
  }

  if (project.owner_id === discordId) {
    return { hasAccess: true, userRole: 'owner' };
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from("dev_project_members")
    .select("role, permissions")
    .eq("project_id", projectId)
    .eq("user_id", discordId)
    .single();

  if (!member) {
    return { hasAccess: false, error: "Not a member of this project" };
  }

  // Check role-based permissions
  const role = member.role;
  const permissions = member.permissions;

  // Owner has all permissions (already handled above)
  if (role === 'admin') {
    if (permission === 'delete_project') {
      return { hasAccess: false, error: "Admins cannot delete projects", userRole: 'admin' };
    }
    return { hasAccess: true, userRole: 'admin' };
  }

  if (role === 'developer') {
    const allowedPermissions: PermissionName[] = [
      'view_project',
      'edit_project',
      'manage_tasks',
      'manage_kanban',
      'manage_files',
      'manage_description',
      'manage_technologies'
    ];
    return { 
      hasAccess: allowedPermissions.includes(permission), 
      userRole: 'developer' 
    };
  }

  if (role === 'tester') {
    return { 
      hasAccess: permission.startsWith('view_'), 
      userRole: 'tester' 
    };
  }

  if (role === 'viewer') {
    return { 
      hasAccess: permission.startsWith('view_'), 
      userRole: 'viewer' 
    };
  }

  // Check custom permissions if defined
  if (permissions && permissions[permission]) {
    return { 
      hasAccess: permissions[permission] as boolean, 
      userRole: role 
    };
  }

  return { hasAccess: false, error: "Insufficient permissions", userRole: role };
}

/**
 * Check if user is a member of a project (for read operations)
 */
export async function checkProjectMembership(projectId: number): Promise<PermissionCheckResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { hasAccess: false, error: "Dev module disabled" };
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { hasAccess: false, error: "Unauthorized" };
  }
  // dev_projects.owner_id (and dev_project_members.user_id below) store the
  // Discord snowflake (profiles.id), never the Supabase Auth UUID - the same
  // mismatch fixed repeatedly elsewhere this session. Comparing against bare
  // user.id meant the actual project owner never matched their own project
  // and fell through to "Not a member" / "Insufficient permissions".
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  // Check if user is owner
  const { data: project } = await supabase
    .from("dev_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { hasAccess: false, error: "Project not found" };
  }

  if (project.owner_id === discordId) {
    return { hasAccess: true, userRole: 'owner' };
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from("dev_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", discordId)
    .single();

  if (!member) {
    return { hasAccess: false, error: "Not a member of this project" };
  }

  return { hasAccess: true, userRole: member.role };
}

/**
 * Log activity to the activity log
 */
export async function logActivity(
  projectId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, any>
): Promise<void> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  await supabase.rpc('log_dev_activity', {
    p_project_id: projectId,
    p_user_id: discordId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_details: details || {}
  });
}
