import test from "node:test";
import assert from "node:assert/strict";
import {
  AuthenticationError,
  RateGuardError,
  serializeError,
  toRateGuardError,
} from "../src/errors/index.js";

test("serializeError returns the production JSON contract", () => {
  const error = new AuthenticationError("Invalid API key", {
    requestId: "req_123",
    backend: "backend",
    retryAfter: 10,
  });

  const json = serializeError(error);

  assert.equal(json.code, "AUTHENTICATION_ERROR");
  assert.equal(json.status, 401);
  assert.equal(json.requestId, "req_123");
  assert.equal(json.retryAfter, 10);
});

test("toRateGuardError wraps unknown errors", () => {
  const error = toRateGuardError(new Error("boom"));
  assert.ok(error instanceof RateGuardError);
  assert.equal(error.code, "INTERNAL_SERVER_ERROR");
});

