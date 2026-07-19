# `@rateguard/hono`

Hono helpers for the RateGuard SDK.

This package returns Hono-compatible middleware for edge and server environments.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { Hono } from "hono";
import { RateGuard, createHonoMiddleware } from "@rateguard/hono";

const app = new Hono();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

app.use("*", createHonoMiddleware(guard, { failMode: "warnOnly" }));
```

## Middleware

### `createHonoMiddleware(client, options?)`

Returns a Hono middleware function that uses the request headers, path, and method to make a decision.

## Configuration

- `identifier`
- `endpoint`
- `method`
- `tenantId`
- `headers`
- `smartMode`
- `failMode`

## Example

```ts
app.use(
  "/api/*",
  createHonoMiddleware(guard, {
    endpoint: (req) => new URL(req.url).pathname,
  })
);
```

## Error Handling

- Blocked requests return a JSON `429` response.
- Allowed requests call `next()` so the route can continue.

## Production Notes

- Keep middleware deterministic and edge-safe.
- Prefer explicit identifiers for authenticated traffic.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
