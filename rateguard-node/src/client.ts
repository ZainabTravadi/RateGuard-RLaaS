import type { Request, Response } from "express";
import {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  DatabaseError,
  InternalServerError,
  MigrationError,
  NetworkError,
  RateGuardError,
  RateLimitExceededError,
  RedisError,
  TimeoutError,
  TransportError,
  ValidationError,
} from "./errors.js";
import { resolveClientConfig } from "./config.js";
import type {
  FailMode,
  RateGuardClientOptions,
  RateGuardLimitOptions,
  RateGuardMiddleware,
  RateGuardMiddlewareOptions,
  RateGuardRequestOptions,
  RateGuardTransport,
  RateGuardTransportRequest,
  RateGuardTransportResponse,
  RateLimitResult,
} from "./types.js";
import { SDK_VERSION } from "./version.js";

function isTransportFactory(
  transport: RateGuardTransport | ((request: RateGuardTransportRequest) => Promise<RateGuardTransportResponse>)
): transport is (request: RateGuardTransportRequest) => Promise<RateGuardTransportResponse> {
  return typeof transport === "function";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(baseDelay: number) {
  const jitter = 0.5 + Math.random();
  return Math.max(0, Math.floor(baseDelay * jitter));
}

function defaultIdentifier(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "anonymous";
}

function defaultEndpoint(req: Request): string {
  return req.path || String(req.originalUrl || req.url).split("?")[0];
}

function defaultMethod(req: Request): string {
  return req.method || "GET";
}

function normalizeBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function getHeaderValue(headers: Record<string, string>, name: string) {
  return headers[name.toLowerCase()] ?? headers[name] ?? undefined;
}

function parseJsonSafe(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapBodyToDetails(body: unknown) {
  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }
  return { raw: body };
}

function mapStatusToError(
  status: number,
  message: string,
  meta: {
    requestId?: string | null;
    retryAfter?: number | null;
    backend: string;
    timestamp?: string;
    details?: Record<string, unknown>;
    cause?: unknown;
  }
) {
  const common = {
    requestId: meta.requestId ?? null,
    retryAfter: meta.retryAfter ?? null,
    backend: meta.backend,
    timestamp: meta.timestamp,
    details: meta.details,
    cause: meta.cause,
    documentationURL: "https://rateguard.dev/docs/errors",
  };

  if (status === 401) {
    return new AuthenticationError(message, common);
  }
  if (status === 403) {
    return new AuthorizationError(message, common);
  }
  if (status === 400 || status === 422) {
    return new ValidationError(message, common);
  }
  if (status === 429) {
    return new RateLimitExceededError(message, common);
  }
  if (status === 503) {
    return new TransportError(message, common);
  }
  if (status === 500) {
    return new InternalServerError(message, common);
  }
  if (status === 502 || status === 504) {
    return new NetworkError(message, common);
  }

  return new RateGuardError({
    code: "INTERNAL_SERVER_ERROR",
    status: status >= 400 ? status : 500,
    message,
    ...common,
    retryable: status >= 500,
  });
}

function mapErrorCode(code: string | undefined, message: string, meta: Parameters<typeof mapStatusToError>[2]) {
  const normalized = String(code || "").toUpperCase();
  if (normalized.includes("AUTH") || normalized === "INVALID_API_KEY" || normalized === "API_KEY_UNAUTHORIZED") {
    return new AuthenticationError(message, meta);
  }
  if (normalized.includes("FORBIDDEN") || normalized.includes("UNAUTHORIZED")) {
    return new AuthorizationError(message, meta);
  }
  if (normalized.includes("VALIDATION") || normalized.includes("INVALID_INPUT") || normalized.includes("BAD_REQUEST")) {
    return new ValidationError(message, meta);
  }
  if (normalized.includes("RATE_LIMIT")) {
    return new RateLimitExceededError(message, meta);
  }
  if (normalized.includes("REDIS")) {
    return new RedisError(message, meta);
  }
  if (normalized.includes("DATABASE")) {
    return new DatabaseError(message, meta);
  }
  if (normalized.includes("MIGRATION")) {
    return new MigrationError(message, meta);
  }
  if (normalized.includes("TRANSPORT")) {
    return new TransportError(message, meta);
  }

  return null;
}

function buildTransport(baseURL: string, apiKey: string, userAgent: string, transport?: RateGuardTransport | ((request: RateGuardTransportRequest) => Promise<RateGuardTransportResponse>)): RateGuardTransport {
  if (transport) {
    if (isTransportFactory(transport)) {
      return {
        send: transport,
      };
    }
    return transport;
  }

  return {
    async send(request: RateGuardTransportRequest): Promise<RateGuardTransportResponse> {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: request.signal,
      });

      const text = await response.text();
      const body = text ? parseJsonSafe(text) : null;
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      return {
        status: response.status,
        headers,
        body,
      };
    },
  };
}

function buildHeaders(config: ReturnType<typeof resolveClientConfig>, extra: Record<string, string> = {}, tenantId?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": config.apiKey,
    "user-agent": config.userAgent,
    ...extra,
  };

  if (config.tenantId) {
    headers["x-rateguard-tenant-id"] = config.tenantId;
  }

  if (tenantId) {
    headers["x-rateguard-tenant-id"] = tenantId;
  }

  return headers;
}

function normalizeRetryAfter(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRateLimitResult(body: unknown, backend: string): RateLimitResult {
  const payload = isRecord(body) ? body : {};
  return {
    allowed: payload.allowed !== false,
    limit: Number(payload.limit ?? 0) || 0,
    remaining: Number(payload.remaining ?? 0) || 0,
    reset: payload.reset === null || payload.reset === undefined ? null : Number(payload.reset) || null,
    retryAfter: normalizeRetryAfter(payload.retryAfter),
    ruleId: typeof payload.ruleId === "string" ? payload.ruleId : null,
    warning: typeof payload.warning === "boolean" ? payload.warning : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    violations: typeof payload.violations === "number" ? payload.violations : Number(payload.violations) || undefined,
    requestId: typeof payload.requestId === "string" ? payload.requestId : null,
    backend,
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString(),
    shadowMode: typeof payload.shadowMode === "boolean" ? payload.shadowMode : undefined,
  };
}

export class RateGuardClient {
  private readonly resolvedConfig;
  private readonly transport: RateGuardTransport;
  private disposed = false;

  constructor(options: RateGuardClientOptions) {
    this.resolvedConfig = resolveClientConfig(options);
    this.transport = buildTransport(
      this.resolvedConfig.baseURL,
      this.resolvedConfig.apiKey,
      this.resolvedConfig.userAgent,
      this.resolvedConfig.transport
    );
  }

  get config() {
    return {
      apiKey: this.resolvedConfig.apiKey,
      baseURL: this.resolvedConfig.baseURL,
      timeout: this.resolvedConfig.timeout,
      retries: this.resolvedConfig.retries,
      retryDelayMs: this.resolvedConfig.retryDelayMs,
      failMode: this.resolvedConfig.failMode,
      tenantId: this.resolvedConfig.tenantId,
      documentationURL: this.resolvedConfig.documentationURL,
      userAgent: this.resolvedConfig.userAgent,
    };
  }

  private ensureOpen() {
    if (this.disposed) {
      throw new ConfigurationError("RateGuardClient has been disposed.", {
        documentationURL: this.resolvedConfig.documentationURL,
      });
    }
  }

  private log(loggerMethod: "debug" | "info" | "warn" | "error", message: string, meta?: unknown) {
    const target = this.resolvedConfig.logger?.[loggerMethod];
    if (typeof target === "function") {
      target(message, meta);
    }
  }

  private async sendWithRetry(payload: RateGuardRequestOptions): Promise<RateLimitResult> {
    this.ensureOpen();

    const backend = this.resolvedConfig.baseURL;
    const url = `${backend}/v1/check`;
    const headers = buildHeaders(this.resolvedConfig, payload.headers, payload.tenantId);
    const body = normalizeBody({
      identifier: payload.identifier,
      endpoint: payload.endpoint ?? "/",
      method: payload.method ?? "GET",
      smartMode: payload.smartMode ?? false,
    });

    let lastError: unknown = null;
    const attempts = this.resolvedConfig.retries + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new TimeoutError(`RateGuard request timed out after ${this.resolvedConfig.timeout}ms`, {
        backend,
        retryable: true,
        documentationURL: this.resolvedConfig.documentationURL,
      })), this.resolvedConfig.timeout);

      try {
        const response = await this.transport.send({
          url,
          method: "POST",
          headers,
          body,
          timeoutMs: this.resolvedConfig.timeout,
          signal: controller.signal,
        });

        const requestId = getHeaderValue(response.headers, "x-request-id") || getHeaderValue(response.headers, "x-correlation-id");
        const retryAfter = normalizeRetryAfter(getHeaderValue(response.headers, "retry-after"));
        const timestamp = new Date().toISOString();

        if (response.status >= 200 && response.status < 300) {
          return normalizeRateLimitResult(response.body, backend);
        }

        const responseBody = response.body && typeof response.body === "object" ? response.body as Record<string, unknown> : { message: String(response.body ?? "") };
        const code = typeof responseBody.code === "string" ? responseBody.code : undefined;
        const message = typeof responseBody.message === "string"
          ? responseBody.message
          : typeof responseBody.error === "string"
            ? responseBody.error
            : `RateGuard backend returned HTTP ${response.status}`;

        const mappedByCode = mapErrorCode(code, message, {
          requestId: requestId ?? null,
          retryAfter: normalizeRetryAfter(responseBody.retryAfter) ?? retryAfter ?? null,
          backend,
          timestamp,
          details: mapBodyToDetails(responseBody),
          cause: responseBody.cause,
        });

        const error = mappedByCode || mapStatusToError(response.status, message, {
          requestId: requestId ?? null,
          retryAfter: normalizeRetryAfter(responseBody.retryAfter) ?? retryAfter ?? null,
          backend,
          timestamp,
          details: mapBodyToDetails(responseBody),
          cause: responseBody.cause,
        });

        if (response.status === 429) {
          return {
            ...normalizeRateLimitResult(response.body, backend),
            allowed: false,
            retryAfter: normalizeRetryAfter(responseBody.retryAfter) ?? retryAfter,
            requestId: requestId ?? null,
            backend,
            timestamp,
          };
        }

        if (response.status >= 500) {
          throw error;
        }

        throw error;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        if (error instanceof RateGuardError && !error.retryable) {
          throw error;
        }

        if (attempt < attempts - 1) {
          const delay = withJitter(this.resolvedConfig.retryDelayMs * Math.pow(2, attempt));
          this.log("warn", "RateGuard request failed, retrying", {
            attempt: attempt + 1,
            delay,
            error: error instanceof Error ? error.message : String(error),
          });
          await sleep(delay);
          continue;
        }

        if (isAbortError(error)) {
          throw new TimeoutError(
            `RateGuard request timed out after ${this.resolvedConfig.timeout}ms`,
            {
              backend,
              cause: error,
              documentationURL: this.resolvedConfig.documentationURL,
            }
          );
        }

        if (error instanceof RateGuardError) {
          throw error;
        }

        const normalized = error instanceof Error ? error : new Error(String(error));
        throw new NetworkError("RateGuard backend unreachable.", {
          backend,
          cause: normalized,
          documentationURL: this.resolvedConfig.documentationURL,
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new TransportError("RateGuard transport failed after retries.", {
      backend,
      cause: lastError,
      documentationURL: this.resolvedConfig.documentationURL,
    });
  }

  private applyFailModeOnError(error: unknown, failMode: FailMode): RateLimitResult {
    const backend = this.resolvedConfig.baseURL;
    const isWarnish = failMode === "warnOnly" || failMode === "shadowMode";

    if (failMode === "failClosed") {
      if (error instanceof Error) {
        throw error;
      }
      throw new TransportError(String(error), { backend, documentationURL: this.resolvedConfig.documentationURL, cause: error });
    }

    this.log("warn", "RateGuard is operating in degraded mode", {
      failMode,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      backend,
      timestamp: new Date().toISOString(),
      warning: isWarnish || failMode === "failOpen" ? failMode !== "failOpen" : undefined,
      shadowMode: failMode === "shadowMode",
    };
  }

  async limit(options: RateGuardLimitOptions): Promise<RateLimitResult> {
    const result = await this.check(options);
    if (!result.allowed && options.failMode !== "warnOnly" && options.failMode !== "shadowMode") {
      throw new RateLimitExceededError("Rate limit exceeded.", {
        requestId: result.requestId ?? null,
        retryAfter: result.retryAfter ?? null,
        backend: result.backend ?? null,
        details: {
          policy: options.identifier,
          limit: result.limit,
          remaining: result.remaining,
          ruleId: result.ruleId ?? null,
          reason: result.reason,
        },
      });
    }

    return result;
  }

  async check(options: RateGuardLimitOptions): Promise<RateLimitResult> {
    this.ensureOpen();
    try {
      const result = await this.sendWithRetry(options);

      if (!result.allowed && options.failMode === "shadowMode") {
        return {
          ...result,
          allowed: true,
          warning: true,
          shadowMode: true,
        };
      }

      if (!result.allowed && options.failMode === "warnOnly") {
        return {
          ...result,
          allowed: true,
          warning: true,
        };
      }

      return result;
    } catch (error) {
      return this.applyFailModeOnError(error, options.failMode ?? this.resolvedConfig.failMode);
    }
  }

  middleware(options: RateGuardMiddlewareOptions = {}): RateGuardMiddleware {
    return async (req: Request, res: Response, next: import("express").NextFunction) => {
      if (options.skip?.(req)) {
        return next();
      }

      const identifier =
        typeof options.identifier === "function"
          ? options.identifier(req)
          : typeof options.identifier === "string"
            ? options.identifier
            : defaultIdentifier(req);
      const endpoint =
        typeof options.endpoint === "function"
          ? options.endpoint(req)
          : typeof options.endpoint === "string"
            ? options.endpoint
            : defaultEndpoint(req);
      const method =
        typeof options.method === "function"
          ? options.method(req)
          : typeof options.method === "string"
            ? options.method
            : defaultMethod(req);
      const tenantId =
        typeof options.tenantId === "function"
          ? options.tenantId(req)
          : options.tenantId;
      const headers =
        typeof options.headers === "function"
          ? options.headers(req)
          : options.headers;
      const failMode = options.failMode ?? this.resolvedConfig.failMode;

      res.setHeader("X-RateGuard-Version", SDK_VERSION);

      try {
        const result = await this.check({
          identifier,
          endpoint,
          method,
          smartMode: options.smartMode,
          tenantId,
          headers,
          failMode,
        });

        if (result.retryAfter !== undefined) {
          res.setHeader("Retry-After", String(result.retryAfter));
        }

        res.setHeader("X-RateLimit-Limit", String(result.limit ?? 0));
        res.setHeader("X-RateLimit-Remaining", String(result.remaining ?? 0));

        if (result.reset !== undefined && result.reset !== null) {
          res.setHeader("X-RateLimit-Reset", String(result.reset));
        }

        if (result.warning) {
          res.setHeader("X-RateGuard-Warning", "true");
        }

        if (result.shadowMode) {
          res.setHeader("X-RateGuard-Shadow", "true");
        }

        await options.onDecision?.(result, req);

        if (!result.allowed && failMode !== "warnOnly" && failMode !== "shadowMode") {
          return res.status(429).json({
            error: "Rate limit exceeded",
            message: result.message || "Rate limit exceeded",
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: result.remaining,
            ruleId: result.ruleId,
            requestId: result.requestId,
            backend: result.backend,
            timestamp: result.timestamp,
            reason: result.reason,
            violations: result.violations,
          });
        }

        return next();
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        const mode = failMode;
        await options.onError?.(failure, req);

        if (mode === "failClosed") {
          return next(failure);
        }

        this.log("warn", "RateGuard middleware degraded request", {
          error: failure.message,
          failMode: mode,
          path: req.originalUrl || req.url,
        });

        if (mode === "warnOnly" || mode === "shadowMode" || mode === "failOpen") {
          res.setHeader("X-RateGuard-Degraded", "true");
          if (mode === "shadowMode") {
            res.setHeader("X-RateGuard-Shadow", "true");
          }
          return next();
        }

        return next(failure);
      }
    };
  }

  async close() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.transport.close) {
      await this.transport.close();
    }
  }

  async dispose() {
    await this.close();
  }
}
