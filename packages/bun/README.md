# `@rateguard/bun`

Bun helpers for the RateGuard SDK.

This package returns a request handler that can be used in Bun-native servers.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { RateGuard, createBunMiddleware } from "@rateguard/bun";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

const handleRequest = createBunMiddleware(guard, { failMode: "warnOnly" });
```

## Middleware

### `createBunMiddleware(client, options?)`

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
const response = await handleRequest(new Request("https://example.com/api"));
```

## Error Handling

- Blocked requests return a `429` JSON response.
- Allowed requests return an empty `200` response.

## Production Notes

- Keep the handler small and stateless.
- Favor explicit identifiers and endpoints for authenticated traffic.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
