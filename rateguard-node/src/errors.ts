export type RateGuardErrorCode =
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "REDIS_ERROR"
  | "DATABASE_ERROR"
  | "MIGRATION_ERROR"
  | "TRANSPORT_ERROR";

export interface RateGuardErrorDetails {
  [key: string]: unknown;
}

export interface RateGuardErrorOptions {
  code: RateGuardErrorCode;
  message: string;
  status: number;
  requestId?: string | null;
  correlationId?: string | null;
  retryAfter?: number | null;
  backend?: string | null;
  timestamp?: string;
  documentationURL?: string;
  cause?: unknown;
  retryable?: boolean;
  details?: RateGuardErrorDetails;
  title?: string;
  reason?: string;
  causes?: string[];
  fixes?: string[];
  example?: string;
}

export class RateGuardError extends Error {
  code: RateGuardErrorCode;
  status: number;
  requestId: string | null;
  correlationId: string | null;
  retryAfter: number | null;
  backend: string | null;
  timestamp: string;
  documentationURL: string;
  retryable: boolean;
  details: RateGuardErrorDetails;
  title: string;
  reason: string;
  causes: string[];
  fixes: string[];
  example?: string;
  override cause?: unknown;

  constructor(options: RateGuardErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId ?? null;
    this.correlationId = options.correlationId ?? null;
    this.retryAfter = options.retryAfter ?? null;
    this.backend = options.backend ?? null;
    this.timestamp = options.timestamp ?? new Date().toISOString();
    this.documentationURL = options.documentationURL || "https://rateguard.dev/docs/errors";
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
    this.title = options.title || this.name;
    this.reason = options.reason || options.message;
    this.causes = options.causes ?? [];
    this.fixes = options.fixes ?? [];
    this.example = options.example;
    this.cause = options.cause;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      title: this.title,
      message: this.message,
      reason: this.reason,
      status: this.status,
      requestId: this.requestId,
      correlationId: this.correlationId,
      retryAfter: this.retryAfter,
      backend: this.backend,
      timestamp: this.timestamp,
      documentationURL: this.documentationURL,
      retryable: this.retryable,
      causes: this.causes,
      fixes: this.fixes,
      example: this.example,
      details: this.details,
    };
  }
}

function mergeErrorDefaults(
  code: RateGuardErrorCode,
  status: number,
  message: string,
  defaults: Partial<RateGuardErrorOptions>,
  overrides: Partial<RateGuardErrorOptions> = {}
): RateGuardErrorOptions {
  return {
    code,
    status,
    message,
    ...defaults,
    ...overrides,
  };
}

export class AuthenticationError extends RateGuardError {
  constructor(message = "Authentication failed", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "AUTHENTICATION_ERROR",
        401,
        message,
        {
          title: "Authentication failed",
          reason: "The request could not be authenticated.",
          causes: ["Missing API key", "Invalid credentials", "Expired token"],
          fixes: ["Set a valid API key", "Rotate credentials", "Check the auth header format"],
          example: "Authorization: Bearer <token>",
          retryable: false,
        },
        options
      )
    );
  }
}

export class AuthorizationError extends RateGuardError {
  constructor(message = "Authorization failed", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "AUTHORIZATION_ERROR",
        403,
        message,
        {
          title: "Authorization failed",
          reason: "The authenticated caller is not allowed to perform this action.",
          causes: ["Insufficient permissions", "Workspace mismatch", "Policy denies access"],
          fixes: ["Grant the required role", "Check workspace scope", "Review policy rules"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class ValidationError extends RateGuardError {
  constructor(message = "Validation failed", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "VALIDATION_ERROR",
        400,
        message,
        {
          title: "Validation failed",
          reason: "The input payload did not pass validation.",
          causes: ["Malformed JSON", "Missing required field", "Unsupported value"],
          fixes: ["Check the request body", "Verify field names and types", "Retry with valid input"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class ConfigurationError extends RateGuardError {
  constructor(message = "Configuration error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "CONFIGURATION_ERROR",
        500,
        message,
        {
          title: "Configuration error",
          reason: "The SDK or backend configuration is invalid.",
          causes: ["Missing environment variable", "Invalid base URL", "Unsupported Node version"],
          fixes: ["Set the documented environment variables", "Use a valid HTTPS URL", "Upgrade Node.js"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class NetworkError extends RateGuardError {
  constructor(message = "Network error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "NETWORK_ERROR",
        503,
        message,
        {
          title: "Network error",
          reason: "The SDK could not reach the backend.",
          causes: ["DNS failure", "TLS handshake failure", "Proxy or firewall blockage"],
          fixes: ["Check the backend URL", "Validate DNS resolution", "Inspect proxy and firewall rules"],
          retryable: true,
        },
        options
      )
    );
  }
}

export class TimeoutError extends RateGuardError {
  constructor(message = "Request timed out", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "TIMEOUT_ERROR",
        504,
        message,
        {
          title: "Request timed out",
          reason: "The backend did not respond within the configured timeout.",
          causes: ["Slow backend", "Network congestion", "Aggressive timeout setting"],
          fixes: ["Increase timeout", "Investigate backend latency", "Retry with exponential backoff"],
          retryable: true,
        },
        options
      )
    );
  }
}

export class RateLimitExceededError extends RateGuardError {
  constructor(message = "Rate limit exceeded", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "RATE_LIMIT_EXCEEDED",
        429,
        message,
        {
          title: "Rate limit exceeded",
          reason: "The policy rejected the request due to rate pressure.",
          causes: ["Burst traffic", "Insufficient quota", "Tight policy window"],
          fixes: ["Retry after the advised delay", "Increase quota", "Tune the policy window"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class InternalServerError extends RateGuardError {
  constructor(message = "Internal server error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "INTERNAL_SERVER_ERROR",
        500,
        message,
        {
          title: "Internal server error",
          reason: "An unexpected error occurred.",
          causes: ["Unhandled exception", "Bug in adapter", "Unexpected backend response"],
          fixes: ["Check logs for the request ID", "Inspect the upstream backend", "Report the bug with the trace details"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class RedisError extends RateGuardError {
  constructor(message = "Redis error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "REDIS_ERROR",
        503,
        message,
        {
          title: "Redis error",
          reason: "Redis could not be reached or responded with an error.",
          causes: ["Redis down", "Authentication failure", "Network timeout"],
          fixes: ["Check Redis connectivity", "Verify credentials", "Inspect Redis logs"],
          retryable: true,
        },
        options
      )
    );
  }
}

export class DatabaseError extends RateGuardError {
  constructor(message = "Database error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "DATABASE_ERROR",
        500,
        message,
        {
          title: "Database error",
          reason: "The persistent store returned an error.",
          causes: ["Connection pool exhaustion", "Migration issue", "SQL error"],
          fixes: ["Review database logs", "Check migrations", "Validate pool and connection settings"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class MigrationError extends RateGuardError {
  constructor(message = "Migration error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "MIGRATION_ERROR",
        500,
        message,
        {
          title: "Migration error",
          reason: "Database migrations are incomplete or failed.",
          causes: ["Pending migration", "Schema drift", "Permission issue"],
          fixes: ["Run pending migrations", "Compare schema versions", "Recheck migration credentials"],
          retryable: false,
        },
        options
      )
    );
  }
}

export class TransportError extends RateGuardError {
  constructor(message = "Transport error", options: Partial<RateGuardErrorOptions> = {}) {
    super(
      mergeErrorDefaults(
        "TRANSPORT_ERROR",
        503,
        message,
        {
          title: "Transport error",
          reason: "The SDK transport could not complete the request.",
          causes: ["Fetch failure", "Proxy issue", "Backend unavailable"],
          fixes: ["Retry with backoff", "Inspect network path", "Verify the backend URL"],
          retryable: true,
        },
        options
      )
    );
  }
}

export function isRateGuardError(error: unknown): error is RateGuardError {
  return error instanceof RateGuardError;
}

export function serializeError(error: unknown) {
  if (error instanceof RateGuardError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      code: "INTERNAL_SERVER_ERROR",
      title: error.name,
      message: error.message,
      reason: error.message,
      status: 500,
      requestId: null,
      correlationId: null,
      retryAfter: null,
      backend: null,
      timestamp: new Date().toISOString(),
      documentationURL: "https://rateguard.dev/docs/errors",
      retryable: false,
      causes: [],
      fixes: ["Check the backend logs", "Retry if the error is transient"],
      example: undefined,
      details: {},
    };
  }

  return {
    name: "Error",
    code: "INTERNAL_SERVER_ERROR",
    title: "Unknown error",
    message: String(error),
    reason: String(error),
    status: 500,
    requestId: null,
    correlationId: null,
    retryAfter: null,
    backend: null,
    timestamp: new Date().toISOString(),
    documentationURL: "https://rateguard.dev/docs/errors",
    retryable: false,
    causes: [],
    fixes: ["Check the backend logs", "Retry if the error is transient"],
    example: undefined,
    details: {},
  };
}

export function formatError(error: unknown, format: "json" | "pretty" = "json") {
  const serialized = serializeError(error);
  if (format === "json") {
    return JSON.stringify(serialized, null, 2);
  }

  const lines = [
    `${serialized.title}: ${serialized.message}`,
    `Code: ${serialized.code}`,
    `Status: ${serialized.status}`,
    serialized.requestId ? `Request ID: ${serialized.requestId}` : null,
    serialized.correlationId ? `Correlation ID: ${serialized.correlationId}` : null,
    serialized.reason ? `Reason: ${serialized.reason}` : null,
    serialized.retryAfter !== null && serialized.retryAfter !== undefined ? `Retry after: ${serialized.retryAfter}s` : null,
    serialized.documentationURL ? `Docs: ${serialized.documentationURL}` : null,
    serialized.fixes?.length ? `Fixes: ${serialized.fixes.join("; ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}
