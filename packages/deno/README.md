# `@rateguard/deno`

Deno helpers for the RateGuard SDK.

This package returns a request handler that works with Deno-compatible request pipelines.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { RateGuard, createDenoMiddleware } from "@rateguard/deno";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

const handleRequest = createDenoMiddleware(guard, { failMode: "warnOnly" });
```

## Middleware

### `createDenoMiddleware(client, options?)`

Returns a function that accepts a `Request` and returns a `Response`.

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
export default {
  async fetch(request: Request) {
    return handleRequest(request);
  },
};
```

## Error Handling

- Blocked requests return a JSON `429` response.
- Allowed requests return an empty `200` response.

## Production Notes

- Keep runtime dependencies small for edge-style deployments.
- Use `shadowMode` while validating route coverage.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
