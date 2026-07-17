import test from "node:test";
import assert from "node:assert/strict";
import { AuthenticationError, RateGuardError, serializeError } from "./errors.js";

test("RateGuard errors serialize predictably", () => {
  const error = new AuthenticationError("Missing API key", {
    requestId: "req_123",
    backend: "https://api.example.com",
    retryAfter: 12,
  });

  const json = serializeError(error);

  assert.equal(json.code, "AUTHENTICATION_ERROR");
  assert.equal(json.requestId, "req_123");
  assert.equal(json.retryAfter, 12);
  assert.equal(json.backend, "https://api.example.com");
});

test("base RateGuardError preserves metadata", () => {
  const error = new RateGuardError({
    code: "TRANSPORT_ERROR",
    status: 503,
    message: "Transport failed",
    backend: "https://api.example.com",
  });

  assert.equal(error.code, "TRANSPORT_ERROR");
  assert.equal(error.status, 503);
  assert.equal(error.backend, "https://api.example.com");
});

