const DEFAULT_DOCS = "https://rateguard.dev/docs/errors";

export class RateGuardError extends Error {
  constructor({
    code,
    message,
    status,
    requestId = null,
    retryAfter = null,
    backend = null,
    timestamp = new Date().toISOString(),
    documentationURL = DEFAULT_DOCS,
    cause,
    retryable = false,
    details = {},
  }) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.backend = backend;
    this.timestamp = timestamp;
    this.documentationURL = documentationURL;
    this.retryable = retryable;
    this.details = details;
    this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      requestId: this.requestId,
      retryAfter: this.retryAfter,
      backend: this.backend,
      timestamp: this.timestamp,
      documentationURL: this.documentationURL,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

function createSubclass(name, code, status, retryable = false) {
  return class extends RateGuardError {
    constructor(message, options = {}) {
      super({ code, status, message, retryable, ...options });
      this.name = name;
    }
  };
}

export const AuthenticationError = createSubclass("AuthenticationError", "AUTHENTICATION_ERROR", 401);
export const AuthorizationError = createSubclass("AuthorizationError", "AUTHORIZATION_ERROR", 403);
export const ValidationError = createSubclass("ValidationError", "VALIDATION_ERROR", 400);
export const ConfigurationError = createSubclass("ConfigurationError", "CONFIGURATION_ERROR", 500);
export const NetworkError = createSubclass("NetworkError", "NETWORK_ERROR", 503, true);
export const TimeoutError = createSubclass("TimeoutError", "TIMEOUT_ERROR", 504, true);
export const RateLimitExceededError = createSubclass("RateLimitExceededError", "RATE_LIMIT_EXCEEDED", 429);
export const InternalServerError = createSubclass("InternalServerError", "INTERNAL_SERVER_ERROR", 500);
export const RedisError = createSubclass("RedisError", "REDIS_ERROR", 503, true);
export const DatabaseError = createSubclass("DatabaseError", "DATABASE_ERROR", 500);
export const MigrationError = createSubclass("MigrationError", "MIGRATION_ERROR", 500);
export const TransportError = createSubclass("TransportError", "TRANSPORT_ERROR", 503, true);

export function serializeError(error) {
  if (error instanceof RateGuardError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      status: 500,
      requestId: null,
      retryAfter: null,
      backend: null,
      timestamp: new Date().toISOString(),
      documentationURL: DEFAULT_DOCS,
      retryable: false,
      details: {},
    };
  }

  return {
    name: "Error",
    code: "INTERNAL_SERVER_ERROR",
    message: String(error),
    status: 500,
    requestId: null,
    retryAfter: null,
    backend: null,
    timestamp: new Date().toISOString(),
    documentationURL: DEFAULT_DOCS,
    retryable: false,
    details: {},
  };
}

export function toRateGuardError(error, fallbackStatus = 500) {
  if (error instanceof RateGuardError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const code = error?.code ? String(error.code).toUpperCase() : "INTERNAL_SERVER_ERROR";

  if (code.includes("AUTH")) {
    return new AuthenticationError(message, { cause: error, details: { code } });
  }

  if (code.includes("VALIDATION") || code.includes("INVALID_INPUT")) {
    return new ValidationError(message, { cause: error, details: { code } });
  }

  if (code.includes("DATABASE")) {
    return new DatabaseError(message, { cause: error, details: { code } });
  }

  if (code.includes("MIGRATION")) {
    return new MigrationError(message, { cause: error, details: { code } });
  }

  if (code.includes("REDIS")) {
    return new RedisError(message, { cause: error, details: { code } });
  }

  if (code.includes("TIMEOUT")) {
    return new TimeoutError(message, { cause: error, details: { code } });
  }

  if (code.includes("NETWORK")) {
    return new NetworkError(message, { cause: error, details: { code } });
  }

  return new InternalServerError(message, {
    cause: error,
    details: { code, fallbackStatus },
  });
}

