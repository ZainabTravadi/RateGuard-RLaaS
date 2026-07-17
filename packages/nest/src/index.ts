import { Injectable, NestMiddleware, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { RateGuard } from "@rateguard/node";
import type { RateGuardMiddlewareOptions } from "@rateguard/node";

export interface NestRateGuardOptions extends RateGuardMiddlewareOptions {
  healthPath?: string;
}

type NestRequestLike = Record<string, unknown> & {
  headers?: Record<string, string | undefined>;
  ip?: string;
  path?: string;
  url?: string;
  method?: string;
};

function resolveStringOption(option: string | ((req: Request) => string) | undefined, req: Request, fallback: string): string {
  if (typeof option === "function") {
    return option(req);
  }

  if (typeof option === "string") {
    return option;
  }

  return fallback;
}

function resolveOptionalStringOption(
  option: string | ((req: Request) => string | undefined) | undefined,
  req: Request
): string | undefined {
  if (typeof option === "function") {
    return option(req);
  }

  return typeof option === "string" ? option : undefined;
}

function resolveHeadersOption(
  option: Record<string, string> | ((req: Request) => Record<string, string>) | undefined,
  req: Request
): Record<string, string> | undefined {
  if (typeof option === "function") {
    return option(req);
  }

  return option;
}

@Injectable()
export class RateGuardMiddleware implements NestMiddleware {
  constructor(private readonly client: RateGuard, private readonly options: NestRateGuardOptions = {}) {}

  async use(req: NestRequestLike, _res: unknown, next: () => void) {
    const request = req as unknown as Request;
    const result = await this.client.check({
      identifier: resolveStringOption(this.options.identifier, request, req.headers?.["x-user-id"] || req.ip || "anonymous"),
      endpoint: resolveStringOption(this.options.endpoint, request, req.path || req.url || "/"),
      method: resolveStringOption(this.options.method, request, req.method || "GET"),
      tenantId: resolveOptionalStringOption(this.options.tenantId, request),
      headers: resolveHeadersOption(this.options.headers, request),
      smartMode: this.options.smartMode,
      failMode: this.options.failMode,
    });

    if (!result.allowed && this.options.failMode !== "warnOnly" && this.options.failMode !== "shadowMode") {
      throw new UnauthorizedException({
        error: "Rate limit exceeded",
        message: result.message || "Rate limit exceeded",
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        requestId: result.requestId,
        backend: result.backend,
      });
    }

    return next();
  }
}

export class RateGuardGuard implements CanActivate {
  constructor(private readonly client: RateGuard, private readonly options: NestRateGuardOptions = {}) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as NestRequestLike;
    const expressRequest = request as unknown as Request;
    const result = await this.client.check({
      identifier: resolveStringOption(this.options.identifier, expressRequest, request.headers?.["x-user-id"] || request.ip || "anonymous"),
      endpoint: resolveStringOption(this.options.endpoint, expressRequest, request.path || request.url || "/"),
      method: resolveStringOption(this.options.method, expressRequest, request.method || "GET"),
      tenantId: resolveOptionalStringOption(this.options.tenantId, expressRequest),
      headers: resolveHeadersOption(this.options.headers, expressRequest),
      smartMode: this.options.smartMode,
      failMode: this.options.failMode,
    });

    return result.allowed || this.options.failMode === "warnOnly" || this.options.failMode === "shadowMode";
  }
}

export { RateGuard };
