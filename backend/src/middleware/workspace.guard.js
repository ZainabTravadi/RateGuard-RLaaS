import { db } from "../db/index.js";
import { randomUUID } from "crypto";

/**
 * Workspace Authorization Middleware
 * Attaches workspace context and role to request
 */
export async function workspaceGuard(req, reply) {
  if (!req.user || !req.user.userId) {
    return reply.code(401).send({ success: false, message: "Unauthorized" });
  }

  try {
    const requestedWorkspaceId = req.headers["x-workspace-id"];
    let membership = null;

    // 1) If caller asked for a specific workspace, prefer that membership
    if (requestedWorkspaceId) {
      const specific = await db.query(
        `
        SELECT 
          w.id as workspace_id,
          w.name as workspace_name,
          w.owner_id,
          wm.role
        FROM workspace_members wm
        JOIN workspaces w ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
          AND wm.workspace_id = $2
        LIMIT 1
        `,
        [req.user.userId, requestedWorkspaceId]
      );

      if (specific.rows.length > 0) {
        membership = specific.rows[0];
      }
    }

    // 2) Fallback to the first membership the user has
    if (!membership) {
      const { rows } = await db.query(
        `
        SELECT 
          w.id as workspace_id,
          w.name as workspace_name,
          w.owner_id,
          wm.role
        FROM workspace_members wm
        JOIN workspaces w ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY wm.created_at ASC
        LIMIT 1
        `,
        [req.user.userId]
      );

      membership = rows[0] || null;
    }

    // 3) No membership at all — auto-provision
    if (!membership) {
      // Auto-provision a workspace for users that predate workspace migration
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        const workspaceId = randomUUID();

        await client.query(
          `INSERT INTO workspaces (id, owner_id, name)
           VALUES ($1, $2, $3)`,
          [workspaceId, req.user.userId, `${req.user.email || "User"}'s Workspace`]
        );

        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES ($1, $2, 'admin')`,
          [workspaceId, req.user.userId]
        );

        await client.query("COMMIT");

        // Re-run lookup with newly created membership
        const retry = await db.query(
          `
          SELECT 
            w.id as workspace_id,
            w.name as workspace_name,
            w.owner_id,
            wm.role
          FROM workspace_members wm
          JOIN workspaces w ON w.id = wm.workspace_id
          WHERE wm.user_id = $1
          LIMIT 1
          `,
          [req.user.userId]
        );

        if (retry.rows.length === 0) {
          return reply.code(403).send({
            success: false,
            message: "No workspace access. Please contact your administrator."
          });
        }

        membership = retry.rows[0];
      } catch (provisionErr) {
        await client.query("ROLLBACK");
        console.error("Workspace auto-provision failed:", provisionErr);
        return reply.code(500).send({
          success: false,
          message: "Workspace authorization failed"
        });
      } finally {
        client.release();
      }
    }

    // 4) If a workspace was requested but not found, block access
    if (requestedWorkspaceId && membership && membership.workspace_id !== requestedWorkspaceId) {
      return reply.code(403).send({
        success: false,
        message: "You do not have access to this workspace"
      });
    }

    if (requestedWorkspaceId && !membership) {
      return reply.code(403).send({
        success: false,
        message: "You do not have access to this workspace"
      });
    }

    const workspace = membership;

    // Attach workspace context to request
    req.workspace = {
      id: workspace.workspace_id,
      name: workspace.workspace_name,
      ownerId: workspace.owner_id,
      role: workspace.role,
      isOwner: workspace.owner_id === req.user.userId,
      isAdmin: workspace.role === 'admin' || workspace.owner_id === req.user.userId,
      isViewer: workspace.role === 'viewer'
    };

  } catch (err) {
    console.error("Workspace guard error:", err?.message || err);
    return reply.code(500).send({ 
      success: false, 
      message: "Workspace authorization failed" 
    });
  }
}

/**
 * Require Admin Role
 */
export function requireAdmin(req, reply, done) {
  if (!req.workspace || !req.workspace.isAdmin) {
    return reply.code(403).send({
      success: false,
      message: "Admin access required"
    });
  }
  done();
}

/**
 * Require Owner Role
 */
export function requireOwner(req, reply, done) {
  if (!req.workspace || !req.workspace.isOwner) {
    return reply.code(403).send({
      success: false,
      message: "Owner access required"
    });
  }
  done();
}
