import test from "node:test";
import assert from "node:assert/strict";
import { resolveClientConfig } from "./config.js";

test("resolveClientConfig validates api key immediately", () => {
  assert.throws(
    () =>
      resolveClientConfig({
        apiKey: "",
      } as never),
    /RATEGUARD_API_KEY is missing/i
  );
});

test("resolveClientConfig accepts explicit production config", () => {
  const config = resolveClientConfig({
    apiKey: "rg_test_123",
    baseURL: "https://api.example.com",
    timeout: 1000,
    retries: 1,
    failMode: "failOpen",
  });

  assert.equal(config.baseURL, "https://api.example.com");
  assert.equal(config.timeout, 1000);
  assert.equal(config.retries, 1);
  assert.equal(config.failMode, "failOpen");
});

