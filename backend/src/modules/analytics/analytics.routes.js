import { requireAuth } from "../auth/auth.guard.js";
import {
  getTimeSeriesAnalytics,
  getAllowedVsBlocked,
  getTopEndpoints
} from "./analytics.service.js";

export async function analyticsRoutes(app) {
  app.addHook("preHandler", requireAuth);

  app.get("/analytics", async (req) => {
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
  });
}
