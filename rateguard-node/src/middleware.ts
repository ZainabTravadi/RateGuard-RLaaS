import { checkRateLimit } from "./client.js";
import type { Request, Response, NextFunction } from 'express';

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  
  return req.ip || "anonymous";
}

export function createMiddleware() {
  return async function rateGuardMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const identifier = getClientIp(req);
    const endpoint = req.originalUrl.split("?")[0];
    const method = req.method;

    const result = await checkRateLimit({
      identifier,
      endpoint,
      method,
    });

    if (!result.allowed) {
      res.status(429).json({
        error: "Rate limit exceeded",
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  };
}
