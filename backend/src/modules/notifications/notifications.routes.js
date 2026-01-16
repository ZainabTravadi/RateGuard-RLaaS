import { 
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
} from "./notifications.service.js";
import { 
  acceptInvite,
  rejectInvite
} from "../workspaces/workspaces.service.js";
import { requireAuth } from "../auth/auth.guard.js";

export async function notificationRoutes(fastify) {
  /**
   * GET /notifications
   * Get user notifications
   */
  fastify.get(
    "/notifications",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const notifications = await getUserNotifications(request.user.userId);

        return reply.code(200).send({
          success: true,
          data: notifications
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch notifications"
        });
      }
    }
  );

  /**
   * GET /notifications/unread-count
   * Get unread notification count
   */
  fastify.get(
    "/notifications/unread-count",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const count = await getUnreadCount(request.user.userId);

        return reply.code(200).send({
          success: true,
          count
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch unread count"
        });
      }
    }
  );

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  fastify.patch(
    "/notifications/:id/read",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await markAsRead(id, request.user.userId);

        return reply.code(200).send({
          success: true,
          message: "Notification marked as read"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to mark as read"
        });
      }
    }
  );

  /**
   * POST /notifications/mark-all-read
   * Mark all notifications as read
   */
  fastify.post(
    "/notifications/mark-all-read",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        await markAllAsRead(request.user.userId);

        return reply.code(200).send({
          success: true,
          message: "All notifications marked as read"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to mark all as read"
        });
      }
    }
  );

  /**
   * DELETE /notifications/:id
   * Delete notification
   */
  fastify.delete(
    "/notifications/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await deleteNotification(id, request.user.userId);

        return reply.code(200).send({
          success: true,
          message: "Notification deleted"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to delete notification"
        });
      }
    }
  );

  /**
   * POST /invites/:id/accept
   * Accept workspace invite
   */
  fastify.post(
    "/invites/:id/accept",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const result = await acceptInvite(id, request.user.userId);

        return reply.code(200).send({
          success: true,
          data: result,
          message: "Invitation accepted successfully"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to accept invitation"
        });
      }
    }
  );

  /**
   * POST /invites/:id/reject
   * Reject workspace invite
   */
  fastify.post(
    "/invites/:id/reject",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { id } = request.params;

        await rejectInvite(id, request.user.userId);

        return reply.code(200).send({
          success: true,
          message: "Invitation rejected"
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(400).send({
          success: false,
          message: err.message || "Failed to reject invitation"
        });
      }
    }
  );
}
