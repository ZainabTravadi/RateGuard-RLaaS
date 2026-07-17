import test from "node:test";
import assert from "node:assert/strict";
import { RateGuardClient } from "./client.js";
import type { RateGuardTransportResponse } from "./types.js";

test("RateGuardClient.limit uses injected transport and returns normalized result", async () => {
  const transport = {
    async send(): Promise<RateGuardTransportResponse> {
      return {
        status: 200,
        headers: {
          "x-request-id": "req_abc",
        },
        body: {
          allowed: true,
          limit: 10,
          remaining: 9,
          retryAfter: 0,
          requestId: "req_abc",
        },
      };
    },
  };

  const client = new RateGuardClient({
    apiKey: "rg_test_123",
    baseURL: "https://api.example.com",
    transport,
  });

  const result = await client.limit({
    identifier: "user_123",
    endpoint: "/v1/test",
    method: "GET",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.limit, 10);
  assert.equal(result.remaining, 9);
  assert.equal(result.requestId, "req_abc");

  await client.dispose();
});

test("RateGuardClient middleware denies blocked responses", async () => {
  const transport = {
    async send(): Promise<RateGuardTransportResponse> {
      return {
        status: 429,
        headers: {
          "retry-after": "12",
          "x-request-id": "req_blocked",
        },
        body: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          allowed: false,
          limit: 2,
          remaining: 0,
          retryAfter: 12,
          requestId: "req_blocked",
        },
      };
    },
  };

  const client = new RateGuardClient({
    apiKey: "rg_test_123",
    baseURL: "https://api.example.com",
    transport,
  });

  const middleware = client.middleware();
  const req = {
    headers: {},
    ip: "127.0.0.1",
    method: "GET",
    path: "/test",
    originalUrl: "/test",
    url: "/test",
  } as never;
  const headers = new Map<string, string>();
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    status(code: number) {
      (this as { statusCode: number }).statusCode = code;
      return this;
    },
    json(payload: unknown) {
      (this as { payload: unknown }).payload = payload;
      return this;
    },
    statusCode: 200,
  } as never;

  await middleware(req, res, () => undefined);

  assert.equal((res as { statusCode: number }).statusCode, 429);
  assert.equal(headers.get("Retry-After"), "12");

  await client.dispose();
});

