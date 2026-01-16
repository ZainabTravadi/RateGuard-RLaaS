import { getCompleteOverview, getPerformanceMetrics } from "./overview.service.js";
import { requireAuth } from "../auth/auth.guard.js";

export async function overviewRoutes(fastify) {
  /**
   * GET /overview
   * Returns complete dashboard overview data
   * Protected route - requires authentication
   */
  fastify.get(
    "/overview",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const userId = request.user.userId;

        const overviewData = await getCompleteOverview(userId);

        return reply.code(200).send({
          success: true,
          data: overviewData
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch overview data"
        });
      }
    }
  );

  /**
   * GET /system-status
   * Returns system uptime and status
   * Protected route - requires authentication
   */
  fastify.get(
    "/system-status",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const userId = request.user.userId;
        const metrics = await getPerformanceMetrics(userId);

        const uptimePercentage = metrics.uptime_percentage;
        const isOperational = uptimePercentage >= 95;

        return reply.code(200).send({
          success: true,
          data: {
            status: isOperational ? "operational" : "degraded",
            uptimePercentage: uptimePercentage,
            message: isOperational 
              ? "All systems operational" 
              : "Experiencing some issues"
          }
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch system status"
        });
      }
    }
  );
}
