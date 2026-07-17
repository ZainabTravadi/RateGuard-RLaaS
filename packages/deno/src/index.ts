import { RateGuard } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export type DenoRateGuardOptions = RateGuardMiddlewareOptions;

export function createDenoMiddleware(client: RateGuard, options: DenoRateGuardOptions = {}) {
  return async (request: Request) => {
    const result = await client.check({
      identifier:
        typeof options.identifier === "function"
          ? options.identifier(request as never)
          : typeof options.identifier === "string"
            ? options.identifier
            : request.headers.get("x-user-id") || "anonymous",
      endpoint:
        typeof options.endpoint === "function"
          ? options.endpoint(request as never)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : new URL(request.url).pathname,
      method:
        typeof options.method === "function"
          ? options.method(request as never)
          : typeof options.method === "string"
            ? options.method
            : request.method,
      tenantId:
        typeof options.tenantId === "function"
          ? options.tenantId(request as never)
          : options.tenantId,
      headers: typeof options.headers === "function" ? options.headers(request as never) : options.headers,
      smartMode: options.smartMode,
      failMode: options.failMode,
    });

    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      return Response.json(
        {
          error: "Rate limit exceeded",
          message: result.message || "Rate limit exceeded",
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
          requestId: result.requestId,
          backend: result.backend,
        },
        { status: 429 }
      );
    }

    return new Response(null, { status: 200 });
  };
}

export { RateGuard };
