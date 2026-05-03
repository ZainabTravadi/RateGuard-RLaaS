import { incrementCounter, getRetryAfter } from "../modules/enforcement/counter.store.js";
import { env } from "../config/env.js";

export function createRouteRateLimitGuard({ routeId, limitCount, windowSeconds }) {
  return async function routeRateLimitGuard(req, reply) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await incrementCounter({
        ruleId: routeId,
        identifier: req.ip,
        windowSeconds,
        limitCount,
        now,
      });

      if (result.allowed) {
        return;
      }

      const retryRes = await getRetryAfter({
        ruleId: routeId,
        identifier: req.ip,
        windowSeconds,
        now,
      });
      const retryAfter = retryRes?.retryAfter ?? retryRes;

      req.log.warn(
        {
          routeId,
          ip: req.ip,
          path: req.url,
          limitCount,
          windowSeconds,
        },
        "route rate limit denied"
      );

      return reply.code(429).header("Retry-After", retryAfter).send({
        error: "Too Many Requests",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded",
      });
    } catch (error) {
      req.log.error(
        { err: error, routeId, ip: req.ip, path: req.url },
        "route rate limit failed"
      );

      if (env.RATE_LIMIT_FAIL_OPEN) {
        return;
      }

      throw error;
    }
  };
}
