import { ZodError } from "zod";

function isRedisError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code.includes("REDIS") ||
    code === "NOSCRIPT" ||
    message.includes("redis") ||
    message.includes("connection is closed") ||
    message.includes("timeout")
  );
}

export function errorHandler(error, request, reply) {
  request.log.error({ err: error }, "request failed");

  if (error instanceof ZodError || error?.code === "VALIDATION_ERROR") {
    return reply.code(400).send({
      error: "Bad Request",
      code: "INVALID_INPUT",
      message: "Invalid input",
    });
  }

  if (error?.code === "API_KEY_UNAUTHORIZED") {
    return reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
  }

  if (isRedisError(error)) {
    return reply.code(500).send({
      error: "Internal Server Error",
      code: "REDIS_ERROR",
      message: "Something went wrong",
    });
  }

  return reply.code(500).send({
    error: "Internal Server Error",
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
}
