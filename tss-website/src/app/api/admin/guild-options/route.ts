import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const forbidden = requireRole(auth, "ADMIN");
  if (forbidden) return forbidden;

  const supabase = createServiceClient();
  const [{ data: channels, error: channelsError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("guild_channels").select("id, name, type").order("position", { ascending: true }),
    supabase.from("guild_roles").select("id, name").order("position", { ascending: false }),
  ]);

  // Missing table (PGRST205, not applied yet) is a normal "picker not
  // ready yet" state here, not an error - callers fall back to manual ID
  // entry either way.
  if (channelsError && channelsError.code !== "PGRST205") console.error("[guild-options] channels error:", channelsError.message);
  if (rolesError && rolesError.code !== "PGRST205") console.error("[guild-options] roles error:", rolesError.message);

  return NextResponse.json({ channels: channels || [], roles: roles || [] });
}
