# `@rateguard/express`

Express helpers for the RateGuard SDK.

This package exposes middleware, health, and error-handler helpers that wrap `RateGuard` with Express-native types.

## Installation

This repository uses npm workspaces. Install dependencies from the repository root:

```bash
npm install
```

If you publish the package internally, the package name is `@rateguard/express`.

## Quick Start

```ts
import express from "express";
import { RateGuard, createExpressMiddleware } from "@rateguard/express";

const app = express();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

app.use(createExpressMiddleware(guard, { failMode: "warnOnly" }));
```

## Middleware

### `createExpressMiddleware(client, options?)`

Returns an Express `RequestHandler`.

#### Options

- `identifier`
- `endpoint`
- `method`
- `skip`
- `tenantId`
- `headers`
- `smartMode`
- `failMode`
- `onDecision`
- `onError`

### `createExpressHealthHandler(client, healthPath?)`

Returns an Express handler that proxies `guard.health()` and responds with `200` or `503`.

### `createExpressErrorHandler(client?)`

Returns an Express error handler that sends a JSON error payload.

## Configuration

- Use explicit `identifier`, `endpoint`, and `method` resolvers for authenticated routes.
- Set `failMode` to `warnOnly` or `shadowMode` when you want to observe traffic before blocking it.

## Example

```ts
app.get(
  "/healthz",
  createExpressHealthHandler(guard)
);

app.use(
  createExpressMiddleware(guard, {
    failMode: "failClosed",
    identifier: (req) => req.headers["x-user-id"]?.toString() ?? req.ip ?? "anonymous",
  })
);

app.use(createExpressErrorHandler(guard));
```

## Error Handling

- `429` responses are returned when the backend blocks a request and the fail mode allows blocking.
- Middleware failures pass to Express error handling when `failMode` is `failClosed`.
- Other fail modes degrade to a warning and continue the request.

## Production Notes

- Mount the middleware early in the stack for protected routes.
- Add the health handler so load balancers can verify readiness.
- Keep request IDs flowing through your proxy and app logs.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
