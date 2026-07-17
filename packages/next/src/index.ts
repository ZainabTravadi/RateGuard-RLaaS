import { NextResponse, type NextRequest } from "next/server";
import { RateGuard } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export type NextRateGuardOptions = RateGuardMiddlewareOptions;

export function createNextMiddleware(client: RateGuard, options: NextRateGuardOptions = {}) {
  return async (request: NextRequest) => {
    const result = await client.check({
      identifier:
        typeof options.identifier === "function"
          ? options.identifier(request as never)
          : typeof options.identifier === "string"
            ? options.identifier
            : request.headers.get("x-user-id") || request.ip || "anonymous",
      endpoint:
        typeof options.endpoint === "function"
          ? options.endpoint(request as never)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : request.nextUrl.pathname,
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

    if (result.retryAfter !== undefined) {
      const headers = new Headers();
      headers.set("Retry-After", String(result.retryAfter));
      if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: result.message || "Rate limit exceeded",
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: result.remaining,
            requestId: result.requestId,
            backend: result.backend,
          },
          { status: 429, headers }
        );
      }
    }

    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      return NextResponse.json(
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

    return NextResponse.next();
  };
}

export { RateGuard };
