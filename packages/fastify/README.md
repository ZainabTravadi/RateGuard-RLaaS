# `@rateguard/fastify`

Fastify helpers for the RateGuard SDK.

This package adds an `onRequest` hook and a health route for Fastify applications.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import Fastify from "fastify";
import { RateGuard, registerFastifyRateGuard } from "@rateguard/fastify";

const app = Fastify();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

await registerFastifyRateGuard(app, guard, { failMode: "warnOnly" });
```

## Middleware

### `registerFastifyRateGuard(app, client, options?)`

Registers:

- an `onRequest` hook that checks the incoming request
- a `GET` health route at `healthPath` or `/healthz`

### `createFastifyHealthHandler(client)`

Returns a Fastify route handler that proxies `guard.health()`.

## Configuration

- `identifier`
- `endpoint`
- `method`
- `tenantId`
- `headers`
- `smartMode`
- `failMode`
- `skip`
- `healthPath`

## Example

```ts
app.post("/login", async (request, reply) => {
  return reply.send({ ok: true });
});
```

When the hook blocks a request, the helper sends a `429` response with the backend metadata.

## Error Handling

- Fastify receives the blocked request before the route handler executes.
- If the request is allowed, the hook calls through to the next handler.
- Use `warnOnly` for rollout testing and `failClosed` for strict enforcement.

## Production Notes

- Register the helper before routes that need protection.
- Keep the health route accessible to your orchestrator.
- Prefer explicit identifier functions instead of relying on anonymous defaults.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
