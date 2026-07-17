import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RateGuard } from "@rateguard/node";
import type { FailMode } from "@rateguard/node";

export interface FastifyRateGuardOptions {
  healthPath?: string;
  identifier?: string | ((request: FastifyRateGuardRequest) => string);
  endpoint?: string | ((request: FastifyRateGuardRequest) => string);
  method?: string | ((request: FastifyRateGuardRequest) => string);
  tenantId?: string | ((request: FastifyRateGuardRequest) => string | undefined);
  headers?: Record<string, string> | ((request: FastifyRateGuardRequest) => Record<string, string>);
  smartMode?: boolean;
  failMode?: FailMode;
  skip?: (request: FastifyRateGuardRequest) => boolean;
}

type FastifyRateGuardRequest = Pick<FastifyRequest, "headers" | "ip" | "url" | "method" | "hostname" | "protocol">;

function toRateGuardRequest(request: FastifyRequest): FastifyRateGuardRequest {
  return {
    headers: request.headers,
    ip: request.ip,
    url: request.url,
    method: request.method,
    hostname: request.hostname,
    protocol: request.protocol,
  };
}

export function registerFastifyRateGuard(app: FastifyInstance, client: RateGuard, options: FastifyRateGuardOptions = {}) {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestLike = toRateGuardRequest(request);

    if (typeof options.skip === "function" && options.skip(requestLike)) {
      return;
    }

    const result = await client.check({
      identifier:
        typeof options.identifier === "function"
          ? options.identifier(requestLike)
          : typeof options.identifier === "string"
            ? options.identifier
            : request.headers["x-user-id"]?.toString() || request.ip || "anonymous",
      endpoint:
        typeof options.endpoint === "function"
          ? options.endpoint(requestLike)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : request.url,
      method:
        typeof options.method === "function"
          ? options.method(requestLike)
          : typeof options.method === "string"
            ? options.method
            : request.method,
      tenantId:
        typeof options.tenantId === "function"
          ? options.tenantId(requestLike)
          : options.tenantId,
      headers: typeof options.headers === "function" ? options.headers(requestLike) : options.headers,
      smartMode: options.smartMode,
      failMode: options.failMode,
    });

    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      reply.code(429).send({
        error: "Rate limit exceeded",
        message: result.message || "Rate limit exceeded",
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        requestId: result.requestId,
        backend: result.backend,
      });
      return reply;
    }
  });
  app.get(options.healthPath ?? "/healthz", async () => {
    return client.health();
  });
  return app;
}

export function createFastifyHealthHandler(client: RateGuard) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    const health = await client.health();
    return reply.code(health.ok ? 200 : 503).send(health);
  };
}

export { RateGuard };
