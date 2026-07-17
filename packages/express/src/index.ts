import type { NextFunction, Request, RequestHandler, Response } from "express";
import { RateGuard } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export interface ExpressRateGuardOptions extends RateGuardMiddlewareOptions {
  healthPath?: string;
}

export function createExpressMiddleware(client: RateGuard, options: ExpressRateGuardOptions = {}): RequestHandler {
  return client.middleware(options);
}

export function createExpressHealthHandler(client: RateGuard, healthPath = "/healthz"): RequestHandler {
  return async (_req: Request, res: Response) => {
    const health = await client.health().catch((error) => ({
      ok: false,
      diagnostics: { error: error instanceof Error ? error.message : String(error) },
    }));
    res.status(health.ok ? 200 : 503).json({
      path: healthPath,
      ...health,
    });
  };
}

export function createExpressErrorHandler(client?: RateGuard) {
  return async (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }
    const payload = error instanceof Error ? { error: error.name, message: error.message } : { error: "Error", message: String(error) };
    res.status(500).json({
      ...payload,
      sdk: client ? "RateGuard" : undefined,
    });
  };
}

export { RateGuard };
