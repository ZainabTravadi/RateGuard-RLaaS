# `@rateguard/koa`

Koa helpers for the RateGuard SDK.

This package provides middleware that sets rate-limit headers and returns a `429` response when enforcement blocks a request.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import Koa from "koa";
import { RateGuard, createKoaMiddleware } from "@rateguard/koa";

const app = new Koa();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

app.use(createKoaMiddleware(guard, { failMode: "warnOnly" }));
```

## Middleware

### `createKoaMiddleware(client, options?)`

Returns a Koa middleware function.

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
  createKoaMiddleware(guard, {
    identifier: (req) => req.headers["x-user-id"]?.toString() ?? "anonymous",
  })
);
```

## Error Handling

- The middleware sets `X-RateGuard-Version`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` when available.
- Blocked requests respond with `429` unless the fail mode allows pass-through.

## Production Notes

- Mount the middleware near the top of the stack.
- Keep route-level identifiers explicit for authenticated APIs.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
