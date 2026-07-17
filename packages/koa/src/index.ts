import type { Middleware } from "koa";
import { RateGuard, SDK_VERSION } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export interface KoaRateGuardOptions extends RateGuardMiddlewareOptions {
  healthPath?: string;
}

export function createKoaMiddleware(client: RateGuard, options: KoaRateGuardOptions = {}): Middleware {
  return async (ctx, next) => {
    const result = await client.check({
      identifier:
        typeof options.identifier === "function"
          ? options.identifier(ctx.req as never)
          : typeof options.identifier === "string"
            ? options.identifier
            : ctx.get("x-user-id") || ctx.ip || "anonymous",
      endpoint:
        typeof options.endpoint === "function"
          ? options.endpoint(ctx.req as never)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : ctx.path,
      method:
        typeof options.method === "function"
          ? options.method(ctx.req as never)
          : typeof options.method === "string"
            ? options.method
            : ctx.method,
      tenantId:
        typeof options.tenantId === "function"
          ? options.tenantId(ctx.req as never)
          : options.tenantId,
      headers: typeof options.headers === "function" ? options.headers(ctx.req as never) : options.headers,
      smartMode: options.smartMode,
      failMode: options.failMode,
    });

    ctx.set("X-RateGuard-Version", SDK_VERSION);
    if (result.retryAfter !== undefined) {
      ctx.set("Retry-After", String(result.retryAfter));
    }
    ctx.set("X-RateLimit-Limit", String(result.limit));
    ctx.set("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      ctx.status = 429;
      ctx.body = {
        error: "Rate limit exceeded",
        message: result.message || "Rate limit exceeded",
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        requestId: result.requestId,
        backend: result.backend,
      };
      return;
    }

    await next();
  };
}

export { RateGuard };
