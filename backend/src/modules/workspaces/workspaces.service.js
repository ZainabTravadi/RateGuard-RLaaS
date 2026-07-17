import { db } from "../../db/index.js";
import { DatabaseError, ValidationError, AuthorizationError } from "../../errors/index.js";
import { createNotification } from "../notifications/notifications.service.js";

function wrapDbError(message, error, details = {}) {
  return new DatabaseError(message, {
    cause: error,
    details,
    documentationURL: "https://rateguard.dev/docs/errors",
  });
}

export async function getWorkspaceMembers(workspaceId) {
  try {
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

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.name.slice(0, 2).toUpperCase(),
      created_at: row.created_at,
      isOwner: row.user_id === row.owner_id,
    }));
  } catch (error) {
    throw wrapDbError("Failed to load workspace members.", error, { workspaceId });
  }
}

export async function inviteToWorkspace(workspaceId, invitedBy, email, role) {
  const client = await db.connect();
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await client.query("BEGIN");

    const userCheck = await client.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    const invitedUserId = userCheck.rows[0]?.id || null;

    if (invitedUserId) {
      const memberCheck = await client.query(
        `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, invitedUserId]
      );
      if (memberCheck.rows.length > 0) {
        throw new ValidationError("User is already a member of this workspace.", {
          details: { workspaceId, email: normalizedEmail },
        });
      }
    }

    const pendingCheck = await client.query(
      `SELECT 1 FROM workspace_invites WHERE workspace_id = $1 AND email = $2 AND status = 'pending'`,
      [workspaceId, normalizedEmail]
    );
    if (pendingCheck.rows.length > 0) {
      throw new ValidationError("An invitation is already pending for this email.", {
        details: { workspaceId, email: normalizedEmail },
      });
    }

    const inviteRes = await client.query(
      `
      INSERT INTO workspace_invites (workspace_id, email, role, invited_by, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, created_at
      `,
      [workspaceId, normalizedEmail, role, invitedBy]
    );

    const inviteId = inviteRes.rows[0].id;
    const workspaceRes = await client.query(`SELECT name FROM workspaces WHERE id = $1`, [workspaceId]);
    const inviterRes = await client.query(`SELECT email FROM users WHERE id = $1`, [invitedBy]);

    if (invitedUserId) {
      await createNotification(
        invitedUserId,
        "workspace_invite",
        {
          invite_id: inviteId,
          workspace_id: workspaceId,
          workspace_name: workspaceRes.rows[0].name,
          invited_by_email: inviterRes.rows[0].email,
          role,
        },
        client
      );
    }

    await client.query("COMMIT");

    return {
      id: inviteId,
      email: normalizedEmail,
      role,
      status: "pending",
      created_at: inviteRes.rows[0].created_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError) {
      throw error;
    }
    throw wrapDbError("Failed to create workspace invitation.", error, { workspaceId, invitedBy, email: normalizedEmail });
  } finally {
    client.release();
  }
}

export async function updateMemberRole(workspaceId, memberId, newRole) {
  try {
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
      throw new ValidationError("Member not found.", {
        details: { workspaceId, memberId },
      });
    }

    return rows[0];
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw wrapDbError("Failed to update workspace member role.", error, { workspaceId, memberId });
  }
}

export async function removeMember(workspaceId, memberId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

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
      throw new ValidationError("Member not found.", { details: { workspaceId, memberId } });
    }

    const member = memberCheck.rows[0];
    if (member.user_id === member.owner_id) {
      throw new AuthorizationError("Cannot remove workspace owner.", {
        details: { workspaceId, memberId },
      });
    }

    await client.query(`DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2`, [memberId, workspaceId]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw wrapDbError("Failed to remove workspace member.", error, { workspaceId, memberId });
  } finally {
    client.release();
  }
}

export async function getWorkspaceInvites(workspaceId) {
  try {
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
  } catch (error) {
    throw wrapDbError("Failed to load workspace invites.", error, { workspaceId });
  }
}

export async function acceptInvite(inviteId, userId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

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
      throw new ValidationError("Invite not found.", { details: { inviteId } });
    }

    const invite = inviteRes.rows[0];
    if (invite.email.toLowerCase() !== invite.user_email.toLowerCase()) {
      throw new AuthorizationError("This invite is not for your email address.", { details: { inviteId } });
    }

    if (invite.status !== "pending") {
      throw new ValidationError("Invite has already been processed.", { details: { inviteId, status: invite.status } });
    }

    const memberCheck = await client.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [invite.workspace_id, userId]
    );

    if (memberCheck.rows.length > 0) {
      throw new ValidationError("You are already a member of this workspace.", { details: { inviteId, userId } });
    }

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [invite.workspace_id, userId, invite.role]
    );

    await client.query(`UPDATE workspace_invites SET status = 'accepted', updated_at = now() WHERE id = $1`, [inviteId]);

    const workspaceRes = await client.query(`SELECT name FROM workspaces WHERE id = $1`, [invite.workspace_id]);

    await createNotification(
      userId,
      "invite_accepted",
      {
        workspace_id: invite.workspace_id,
        workspace_name: workspaceRes.rows[0].name,
        role: invite.role,
      },
      client
    );

    await client.query("COMMIT");

    return {
      success: true,
      workspace_id: invite.workspace_id,
      role: invite.role,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw wrapDbError("Failed to accept workspace invite.", error, { inviteId, userId });
  } finally {
    client.release();
  }
}

export async function rejectInvite(inviteId, userId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

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
      throw new ValidationError("Invite not found.", { details: { inviteId } });
    }

    const invite = inviteRes.rows[0];
    if (invite.email.toLowerCase() !== invite.user_email.toLowerCase()) {
      throw new AuthorizationError("This invite is not for your email address.", { details: { inviteId } });
    }
    if (invite.status !== "pending") {
      throw new ValidationError("Invite has already been processed.", { details: { inviteId, status: invite.status } });
    }

    await client.query(`UPDATE workspace_invites SET status = 'rejected', updated_at = now() WHERE id = $1`, [inviteId]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw wrapDbError("Failed to reject workspace invite.", error, { inviteId, userId });
  } finally {
    client.release();
  }
}

