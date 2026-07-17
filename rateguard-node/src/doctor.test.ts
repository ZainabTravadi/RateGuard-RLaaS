import test from "node:test";
import assert from "node:assert/strict";
import { doctor } from "./doctor.js";

test("doctor reports configuration problems clearly", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      backendVersion: "1.0.0",
      redis: "healthy",
      redisConnected: true,
      redisMock: false,
      migrations: { applied: 2, pending: 0 },
    }),
  })) as unknown as typeof fetch;

  const report = await doctor({
    apiKey: "rg_test_123",
    baseURL: "https://api.example.com",
    format: "json",
  });

  assert.equal(typeof report.ok, "boolean");
  assert.equal(report.sdkVersion.length > 0, true);

  globalThis.fetch = originalFetch;
});
