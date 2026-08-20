import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const inviteId = parseInt(id);
  const body = await request.json();
  const { action } = body; // 'accept' or 'reject'

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from("dev_project_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // Check if invite is still pending
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });
  }

  // Check if invite is expired
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  // For accept/reject, check if user is the invite recipient
  if (action === 'accept' || action === 'reject') {
    const userEmail = user.email;
    // profiles.id is the Discord snowflake (user_metadata.provider_id), not
    // the Supabase Auth UUID — user.id never matches the real row for a
    // Discord-linked account.
    const discordId = (user.user_metadata as any)?.provider_id || user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, joined_projects_limit")
      .eq("id", discordId)
      .single();

    if (invite.email !== userEmail && invite.username !== profile?.username) {
      return NextResponse.json({ error: "You are not the recipient of this invite" }, { status: 403 });
    }

    // Check joined projects limit before accepting
    if (action === 'accept') {
      const joinedProjectsLimit = profile?.joined_projects_limit || 3;

      // Count current joined projects (excluding the one being invited to)
      const { count: joinedProjectsCount } = await supabase
        .from("dev_project_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (joinedProjectsCount && joinedProjectsCount >= joinedProjectsLimit) {
        return NextResponse.json(
          {
            error: "Joined projects limit reached",
            message: `You have reached your limit of ${joinedProjectsLimit} joined project(s). Leave some projects to accept this invite.`
          },
          { status: 400 }
        );
      }
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const acceptedAt = action === 'accept' ? new Date().toISOString() : null;

    const { data: updatedInvite, error: updateError } = await supabase
      .from("dev_project_invites")
      .update({
        status: newStatus,
        accepted_at: acceptedAt,
      })
      .eq("id", inviteId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedInvite);
  }

  // For cancel, check if user is owner or admin
  if (action === 'cancel') {
    const { data: project } = await supabase
      .from("dev_projects")
      .select("owner_id")
      .eq("id", invite.project_id)
      .single();

    if (!project || project.owner_id !== user.id) {
      const { data: member } = await supabase
        .from("dev_project_members")
        .select("role")
        .eq("project_id", invite.project_id)
        .eq("user_id", user.id)
        .single();

      if (!member || member.role !== 'admin') {
        return NextResponse.json({ error: "Only project owners and admins can cancel invites" }, { status: 403 });
      }
    }

    const { data: updatedInvite, error: updateError } = await supabase
      .from("dev_project_invites")
      .update({ status: 'cancelled' })
      .eq("id", inviteId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the activity
    await supabase.rpc('log_dev_activity', {
      p_project_id: invite.project_id,
      p_user_id: user.id,
      p_action: 'invite_cancelled',
      p_entity_type: 'project_invite',
      p_entity_id: inviteId,
      p_details: { email: invite.email }
    });

    return NextResponse.json(updatedInvite);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const inviteId = parseInt(id);

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from("dev_project_invites")
    .select("project_id")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // Check if user is owner or admin
  const { data: project } = await supabase
    .from("dev_projects")
    .select("owner_id")
    .eq("id", invite.project_id)
    .single();

  if (!project || project.owner_id !== user.id) {
    const { data: member } = await supabase
      .from("dev_project_members")
      .select("role")
      .eq("project_id", invite.project_id)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: "Only project owners and admins can delete invites" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("dev_project_invites")
    .delete()
    .eq("id", inviteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
