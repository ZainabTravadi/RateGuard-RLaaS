# `@rateguard/next`

Next.js middleware helpers for the RateGuard SDK.

This package returns a `NextResponse`-compatible middleware function for App Router or edge middleware usage.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { NextRequest } from "next/server";
import { RateGuard, createNextMiddleware } from "@rateguard/next";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

export const middleware = createNextMiddleware(guard, { failMode: "warnOnly" });
```

## Middleware

### `createNextMiddleware(client, options?)`

Returns a function that accepts a `NextRequest` and returns `NextResponse.next()` or a JSON `429` response.

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
export default createNextMiddleware(guard, {
  endpoint: (request) => request.nextUrl.pathname,
  identifier: (request) => request.headers.get("x-user-id") || "anonymous",
});
```

## Error Handling

- Blocked requests return a JSON `429` response.
- Allowed requests continue to the next middleware stage.

## Production Notes

- Keep the middleware file small and edge-safe.
- Prefer `warnOnly` or `shadowMode` while validating route coverage.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
