import { incrementCounter, getRetryAfter } from "../modules/enforcement/counter.store.js";
import { env } from "../config/env.js";
import { RateLimitExceededError, TransportError } from "../errors/index.js";

function shouldAllowOnFailure(failMode) {
  return failMode === "failOpen" || failMode === "warnOnly" || failMode === "shadowMode";
}

export function createRouteRateLimitGuard({ routeId, limitCount, windowSeconds, failMode = env.RATE_LIMIT_FAIL_MODE }) {
  return async function routeRateLimitGuard(req, _reply) {
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

      if (failMode === "shadowMode" || failMode === "warnOnly") {
        req.log.warn(
          {
            routeId,
            ip: req.ip,
            path: req.url,
            limitCount,
            windowSeconds,
            retryAfter,
            failMode,
          },
          "route rate limit shadowed"
        );
        return;
      }

      throw new RateLimitExceededError("Rate limit exceeded.", {
        retryAfter,
        details: {
          routeId,
          limitCount,
          windowSeconds,
        },
        documentationURL: "https://rateguard.dev/docs/errors",
      });
    } catch (error) {
      req.log.error(
        { err: error, routeId, ip: req.ip, path: req.url, failMode },
        "route rate limit failed"
      );

      if (shouldAllowOnFailure(failMode)) {
        return;
      }

      throw new TransportError("Rate limit enforcement failed.", {
        cause: error,
        backend: "redis",
        details: { routeId, limitCount, windowSeconds },
      });
    }
  };
}
