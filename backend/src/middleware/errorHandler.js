import { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  DatabaseError,
  MigrationError,
  RateGuardError,
  RateLimitExceededError,
  RedisError,
  TimeoutError,
  TransportError,
  ValidationError,
  serializeError,
  toRateGuardError,
} from "../errors/index.js";

function mapError(error) {
  if (error instanceof RateGuardError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError("Validation failed.", {
      details: { issues: error.issues },
      cause: error,
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  }

  const code = String(error?.code || "").toUpperCase();
  if (code === "VALIDATION_ERROR") return new ValidationError(error.message, { cause: error });
  if (code === "AUTHENTICATION_ERROR" || code === "API_KEY_UNAUTHORIZED" || code === "INVALID_API_KEY") return new AuthenticationError(error.message, { cause: error });
  if (code === "AUTHORIZATION_ERROR") return new AuthorizationError(error.message, { cause: error });
  if (code === "CONFIGURATION_ERROR") return new ConfigurationError(error.message, { cause: error });
  if (code === "DATABASE_ERROR") return new DatabaseError(error.message, { cause: error });
  if (code === "MIGRATION_ERROR") return new MigrationError(error.message, { cause: error });
  if (code === "REDIS_ERROR") return new RedisError(error.message, { cause: error });
  if (code === "TIMEOUT_ERROR") return new TimeoutError(error.message, { cause: error });
  if (code === "TRANSPORT_ERROR") return new TransportError(error.message, { cause: error });
  if (code === "RATE_LIMIT_EXCEEDED") return new RateLimitExceededError(error.message, { cause: error });

  return toRateGuardError(error, error?.statusCode || error?.status || 500);
}

export function errorHandler(error, request, reply) {
  const mapped = mapError(error);

  request.log.error(
    {
      err: serializeError(mapped),
      requestId: request.id,
      path: request.url,
      method: request.method,
    },
    "request failed"
  );

  reply.code(mapped.status || 500).send({
    error: mapped.name,
    code: mapped.code,
    message: mapped.message,
    status: mapped.status,
    requestId: mapped.requestId ?? request.id,
    retryAfter: mapped.retryAfter ?? null,
    backend: mapped.backend ?? null,
    timestamp: mapped.timestamp,
    documentationURL: mapped.documentationURL,
    retryable: mapped.retryable,
    details: mapped.details ?? {},
  });
}
