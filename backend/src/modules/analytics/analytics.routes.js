import { requireAuth } from "../auth/auth.guard.js";
import {
  getApiKeyStats,
  getTimeSeriesAnalytics,
  getAllowedVsBlocked,
  getTopEndpoints
} from "./analytics.service.js";
import { getCompleteOverview } from "../overview/overview.service.js";

export async function analyticsRoutes(app) {
  app.addHook("preHandler", requireAuth);

  app.get("/analytics/overview", async (req) => {
    // overview must be scoped to the authenticated user and accept an optional range
    const { range = "30d" } = req.query || {};
    const userId = req.user.userId;
    const analyticsData = await getCompleteOverview(userId, range);
    console.log("ANALYTICS RESPONSE", analyticsData);
    return analyticsData;
  });

  app.get("/analytics/endpoints", async (req) => {
    const { limit = 10 } = req.query || {};
    const userId = req.user.userId;
    const endpoints = await getTopEndpoints(userId, "30d", Number(limit) || 10);
    return { endpoints };
  });

  app.get("/analytics/apikeys", async (req) => {
    const { limit = 10 } = req.query || {};
    const userId = req.user.userId;
    const apiKeys = await getApiKeyStats(userId, { limit: Number(limit) || 10 });
    return { apiKeys };
  });

  app.get("/analytics", async (req) => {
    try {
      const { range = "30d" } = req.query;
      const userId = req.user.userId;

      const [timeSeries, allowedVsBlocked, topEndpoints] =
        await Promise.all([
          getTimeSeriesAnalytics(userId, range),
          getAllowedVsBlocked(userId, range),
          getTopEndpoints(userId, range)
        ]);

      const analyticsData = {
        timeSeries,
        allowedVsBlocked,
        topEndpoints
      };
      console.log("ANALYTICS RESPONSE", analyticsData);
      return analyticsData;
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
