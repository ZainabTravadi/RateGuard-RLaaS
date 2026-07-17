import { RateGuard } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export type HonoRateGuardOptions = RateGuardMiddlewareOptions;

export function createHonoMiddleware(client: RateGuard, options: HonoRateGuardOptions = {}) {
  return async (c: { req: Request; header: (name: string) => string | undefined; set: (name: string, value: string) => void; json: (value: unknown, status?: number) => Response }, next: () => Promise<void>) => {
    const result = await client.check({
      identifier:
        typeof options.identifier === "function"
          ? options.identifier(c.req as never)
          : typeof options.identifier === "string"
            ? options.identifier
            : c.header("x-user-id") || "anonymous",
      endpoint:
        typeof options.endpoint === "function"
          ? options.endpoint(c.req as never)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : new URL(c.req.url).pathname,
      method:
        typeof options.method === "function"
          ? options.method(c.req as never)
          : typeof options.method === "string"
            ? options.method
            : c.req.method,
      tenantId:
        typeof options.tenantId === "function"
          ? options.tenantId(c.req as never)
          : options.tenantId,
      headers: typeof options.headers === "function" ? options.headers(c.req as never) : options.headers,
      smartMode: options.smartMode,
      failMode: options.failMode,
    });

    if (result.retryAfter !== undefined) {
      c.set("Retry-After", String(result.retryAfter));
    }

    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      return c.json({
        error: "Rate limit exceeded",
        message: result.message || "Rate limit exceeded",
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        requestId: result.requestId,
        backend: result.backend,
      }, 429);
    }

    return next();
  };
}

export { RateGuard };
