import { db } from "../../db/index.js";
import { randomUUID } from "crypto";
import { createNotification } from "../notifications/notifications.service.js";

/**
 * Get all workspace members
 */
export async function getWorkspaceMembers(workspaceId) {
  const { rows } = await db.query(
    `
    SELECT
      wm.id,
      u.id as user_id,
      u.email,
      SPLIT_PART(u.email, '@', 1) AS name,
      wm.role,
      wm.created_at,
      w.owner_id
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.workspace_id = $1
    ORDER BY wm.created_at ASC
    `,
    [workspaceId]
  );

  return rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.name.slice(0, 2).toUpperCase(),
    created_at: row.created_at,
    isOwner: row.user_id === row.owner_id
  }));
}

/**
 * Invite a user to workspace
 */
export async function inviteToWorkspace(workspaceId, invitedBy, email, role) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    email = email.toLowerCase().trim();

    // Check if user exists
    const userCheck = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    const invitedUserId = userCheck.rows[0]?.id || null;

    // Check if already a member
    if (invitedUserId) {
      const memberCheck = await client.query(
        `SELECT 1 FROM workspace_members 
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, invitedUserId]
      );

      if (memberCheck.rows.length > 0) {
        throw new Error("User is already a member of this workspace");
      }
    }

    // Check for pending invite
    const pendingCheck = await client.query(
      `SELECT 1 FROM workspace_invites 
       WHERE workspace_id = $1 AND email = $2 AND status = 'pending'`,
      [workspaceId, email]
    );

    if (pendingCheck.rows.length > 0) {
      throw new Error("An invitation is already pending for this email");
    }

    // Create invite
    const inviteRes = await client.query(
      `
      INSERT INTO workspace_invites (workspace_id, email, role, invited_by, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, created_at
      `,
      [workspaceId, email, role, invitedBy]
    );

    const inviteId = inviteRes.rows[0].id;

    // Get workspace name for notification
    const workspaceRes = await client.query(
      `SELECT name FROM workspaces WHERE id = $1`,
      [workspaceId]
    );

    const workspaceName = workspaceRes.rows[0].name;

    // Get inviter name
    const inviterRes = await client.query(
      `SELECT email FROM users WHERE id = $1`,
      [invitedBy]
    );

    const inviterEmail = inviterRes.rows[0].email;

    // Create notification if user exists
    if (invitedUserId) {
      await createNotification(
        invitedUserId,
        "workspace_invite",
        {
          invite_id: inviteId,
          workspace_id: workspaceId,
          workspace_name: workspaceName,
          invited_by_email: inviterEmail,
          role: role
        },
        client
      );
    }

    await client.query("COMMIT");

    return {
      id: inviteId,
      email,
      role,
      status: "pending",
      created_at: inviteRes.rows[0].created_at
    };

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Invite error:", err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(workspaceId, memberId, newRole) {
  const { rows } = await db.query(
    `
    UPDATE workspace_members
    SET role = $1
    WHERE id = $2 AND workspace_id = $3
    RETURNING id, role
    `,
    [newRole, memberId, workspaceId]
  );

  if (rows.length === 0) {
    throw new Error("Member not found");
  }

  return rows[0];
}

/**
 * Remove member from workspace
 */
export async function removeMember(workspaceId, memberId, requesterId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Check if trying to remove owner
    const memberCheck = await client.query(
      `
      SELECT wm.user_id, w.owner_id
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.id = $1 AND wm.workspace_id = $2
      `,
      [memberId, workspaceId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error("Member not found");
    }

    const member = memberCheck.rows[0];

    if (member.user_id === member.owner_id) {
      throw new Error("Cannot remove workspace owner");
    }

    // Delete member
    await client.query(
      `DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2`,
      [memberId, workspaceId]
    );

    await client.query("COMMIT");

    return { success: true };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get pending invites for workspace (admin view)
 */
export async function getWorkspaceInvites(workspaceId) {
  const { rows } = await db.query(
    `
    SELECT
      wi.id,
      wi.email,
      wi.role,
      wi.status,
      wi.created_at,
      u.email as invited_by_email
    FROM workspace_invites wi
    JOIN users u ON u.id = wi.invited_by
    WHERE wi.workspace_id = $1
    ORDER BY wi.created_at DESC
    `,
    [workspaceId]
  );

  return rows;
}

/**
 * Accept workspace invite
 */
export async function acceptInvite(inviteId, userId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get invite details
    const inviteRes = await client.query(
      `
      SELECT wi.workspace_id, wi.email, wi.role, wi.status, u.email as user_email
      FROM workspace_invites wi
      JOIN users u ON u.id = $2
      WHERE wi.id = $1
      `,
      [inviteId, userId]
    );

    if (inviteRes.rows.length === 0) {
      throw new Error("Invite not found");
    }

    const invite = inviteRes.rows[0];

    if (invite.email.toLowerCase() !== invite.user_email.toLowerCase()) {
      throw new Error("This invite is not for your email address");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite has already been processed");
    }

    // Check if already a member
    const memberCheck = await client.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [invite.workspace_id, userId]
    );

    if (memberCheck.rows.length > 0) {
      throw new Error("You are already a member of this workspace");
    }

    // Add to workspace
    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [invite.workspace_id, userId, invite.role]
    );

    // Update invite status
    await client.query(
      `UPDATE workspace_invites SET status = 'accepted' WHERE id = $1`,
      [inviteId]
    );

    // Get workspace name
    const workspaceRes = await client.query(
      `SELECT name FROM workspaces WHERE id = $1`,
      [invite.workspace_id]
    );

    // Create success notification
    await createNotification(
      userId,
      "invite_accepted",
      {
        workspace_id: invite.workspace_id,
        workspace_name: workspaceRes.rows[0].name,
        role: invite.role
      },
      client
    );

    await client.query("COMMIT");

    return {
      success: true,
      workspace_id: invite.workspace_id,
      role: invite.role
    };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reject workspace invite
 */
export async function rejectInvite(inviteId, userId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Verify invite belongs to user
    const inviteRes = await client.query(
      `
      SELECT wi.email, u.email as user_email, wi.status
      FROM workspace_invites wi
      JOIN users u ON u.id = $2
      WHERE wi.id = $1
      `,
      [inviteId, userId]
    );

    if (inviteRes.rows.length === 0) {
      throw new Error("Invite not found");
    }

    const invite = inviteRes.rows[0];

    if (invite.email.toLowerCase() !== invite.user_email.toLowerCase()) {
      throw new Error("This invite is not for your email address");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite has already been processed");
    }

    // Update status to rejected
    await client.query(
      `UPDATE workspace_invites SET status = 'rejected' WHERE id = $1`,
      [inviteId]
    );

    await client.query("COMMIT");

    return { success: true };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
