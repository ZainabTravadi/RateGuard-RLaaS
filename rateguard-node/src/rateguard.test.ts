import test from "node:test";
import assert from "node:assert/strict";
import { RateGuard, PolicyBuilder } from "./index.js";

test("builder creates a fluent client with policy registration", async () => {
  const transport = {
    async send() {
      return {
        status: 200,
        headers: { "x-request-id": "req_1" },
        body: {
          allowed: true,
          limit: 10,
          remaining: 9,
          requestId: "req_1",
        },
      };
    },
  };

  const rg = RateGuard.builder()
    .apiKey("rg_test_123")
    .baseURL("https://api.example.com")
    .transport(transport)
    .plugin({
      name: "capture",
      beforeInit(ctx) {
        void ctx;
      },
    })
    .build();

  rg.policy("login")
    .limit(10)
    .window("1m")
    .identifier((ctx) => ctx.ip || "127.0.0.1")
    .endpoint("/login");

  const result = await rg.limit({
    policy: "login",
    ip: "127.0.0.1",
    path: "/login",
    method: "POST",
  });

  assert.equal(result.policy, "login");
  assert.equal(result.limit, 10);
  assert.equal(result.allowed, true);

  await rg.shutdown();
});

test("policy builder remains chainable", () => {
  const builder = new PolicyBuilder("signup", () => undefined);
  const policy = builder.limit(5).window("30s").description("signup policy").build();

  assert.equal(policy.name, "signup");
  assert.equal(policy.limit, 5);
  assert.equal(policy.window, "30s");
});
