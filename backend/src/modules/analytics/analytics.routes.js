import { requireAuth } from "../auth/auth.guard.js";
import {
  getApiKeyStats,
  getEndpointStats,
  getGlobalStats,
  getTimeSeriesAnalytics,
  getAllowedVsBlocked,
  getTopEndpoints
} from "./analytics.service.js";

export async function analyticsRoutes(app) {
  app.addHook("preHandler", requireAuth);

  app.get("/analytics/overview", async () => {
    return getGlobalStats();
  });

  app.get("/analytics/endpoints", async (req) => {
    const { limit = 10 } = req.query || {};
    const endpoints = await getEndpointStats({ limit: Number(limit) || 10 });
    return { endpoints };
  });

  app.get("/analytics/apikeys", async (req) => {
    const { limit = 10 } = req.query || {};
    const apiKeys = await getApiKeyStats({ limit: Number(limit) || 10 });
    return { apiKeys };
  });

  app.get("/analytics", async (req) => {
    try {
      const { range = "24h" } = req.query;
      const userId = req.user.userId;

      const [timeSeries, allowedVsBlocked, topEndpoints] =
        await Promise.all([
          getTimeSeriesAnalytics(userId, range),
          getAllowedVsBlocked(userId),
          getTopEndpoints(userId)
        ]);

      return {
        timeSeries,
        allowedVsBlocked,
        topEndpoints
      };
    } catch (err) {
      app.log.error(err);
      return {
        timeSeries: [],
        allowedVsBlocked: [],
        topEndpoints: []
      };
    }
  });
}
