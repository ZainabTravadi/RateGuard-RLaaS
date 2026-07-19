# Quick Start

This guide gets you from a fresh install to a working decision check in under two minutes.

## 1. Install

```bash
npm install @rateguard/node
```

## 2. Start The Backend

Set the backend environment variables and start the service:

```bash
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/rateguard
set JWT_SECRET=replace-me
set RATE_LIMIT_FAIL_MODE=failClosed
npm run dev --workspace backend
```

If `REDIS_URL` is not set in development, the backend will use in-memory Redis compatibility mode.

## 3. Create A Client

```ts
import { RateGuard } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .failMode("shadowMode")
  .build();
```

## 4. Add A Policy

```ts
guard.policy("login")
  .limit(10)
  .window("1m")
  .identifier((ctx) => ctx.identifier ?? ctx.ip ?? "anonymous")
  .endpoint("/login")
  .method("POST")
  .description("Protect the login endpoint")
  .build();
```

## 5. Check A Request

```ts
const decision = await guard.check({
  policy: "login",
  identifier: "user_123",
  endpoint: "/login",
  method: "POST",
});

if (!decision.allowed) {
  console.log("blocked", decision.retryAfter);
}
```

## 6. Verify The Setup

```bash
npx rateguard doctor
```

## What To Expect

- `check()` returns a structured decision with `allowed`, `limit`, `remaining`, `retryAfter`, `requestId`, and backend metadata.
- `shadowMode` evaluates a policy without enforcing the block.
- `guard.shutdown()` closes the client cleanly when your process exits.

## Next Steps

- Add middleware with `guard.middleware()`.
- Simulate policies with `npx rateguard simulate`.
- Open the dashboard to inspect analytics and logs.

## Related Docs

- [Installation](installation.md)
- [API Reference](api-reference.md)
- [Framework Guides](framework-guides.md)
- [Examples](examples.md)
