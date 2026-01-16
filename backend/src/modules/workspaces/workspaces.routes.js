import { 
  getWorkspaceMembers,
  inviteToWorkspace,
  updateMemberRole,
  removeMember,
  getWorkspaceInvites
} from "./workspaces.service.js";
import { requireAuth } from "../auth/auth.guard.js";
import { workspaceGuard, requireAdmin } from "../../middleware/workspace.guard.js";

export async function workspaceRoutes(fastify) {
  /**
   * GET /team/members
   * Get all workspace members
   */
  fastify.get(
    "/team/members",
    { preHandler: [requireAuth, workspaceGuard] },
    async (request, reply) => {
      try {
        const members = await getWorkspaceMembers(request.workspace.id);

        return reply.code(200).send({
          success: true,
          data: members
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: err.message || "Failed to fetch team members"
        });
      }
    }
  );

  /**
   * POST /team/invite
   * Invite a user to workspace (admin only)
   */
  fastify.post(
    "/team/invite",
    { preHandler: [requireAuth, workspaceGuard, requireAdmin] },
    async (request, reply) => {
      try {
        const { email, role } = request.body;

        if (!email || !role) {
          return reply.code(400).send({
            success: false,
            message: "Email and role are required"
          });
        }

        if (!["admin", "viewer"].includes(role)) {
          return reply.code(400).send({
            success: false,
            message: "Role must be 'admin' or 'viewer'"
          });
        }

        const invite = await inviteToWorkspace(
          request.workspace.id,
          request.user.userId,
          email,
          role
        );

        return reply.code(201).send({
          success: true,
          data: invite,
          message: "Invitation sent successfully"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to send invitation"
        });
      }
    }
  );

  /**
   * PATCH /team/members/:id
   * Update member role (admin only)
   */
  fastify.patch(
    "/team/members/:id",
    { preHandler: [requireAuth, workspaceGuard, requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { role } = request.body;

        if (!role || !["admin", "viewer"].includes(role)) {
          return reply.code(400).send({
            success: false,
            message: "Invalid role"
          });
        }

        await updateMemberRole(request.workspace.id, id, role);

        return reply.code(200).send({
          success: true,
          message: "Role updated successfully"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to update role"
        });
      }
    }
  );

  /**
   * DELETE /team/members/:id
   * Remove member from workspace (admin only)
   */
  fastify.delete(
    "/team/members/:id",
    { preHandler: [requireAuth, workspaceGuard, requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await removeMember(
          request.workspace.id,
          id,
          request.user.userId
        );

        return reply.code(200).send({
          success: true,
          message: "Member removed successfully"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to remove member"
        });
      }
    }
  );

  /**
   * GET /team/invites
   * Get workspace invites (admin only)
   */
  fastify.get(
    "/team/invites",
    { preHandler: [requireAuth, workspaceGuard, requireAdmin] },
    async (request, reply) => {
      try {
        const invites = await getWorkspaceInvites(request.workspace.id);

        return reply.code(200).send({
          success: true,
          data: invites
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch invites"
        });
      }
    }
  );
}
