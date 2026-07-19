# `@rateguard/cloudflare`

Cloudflare Workers helpers for the RateGuard SDK.

This package returns a Worker-friendly request handler that can be used in edge deployments.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { RateGuard, createCloudflareHandler } from "@rateguard/cloudflare";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

export default {
  async fetch(request: Request) {
    return createCloudflareHandler(guard, { failMode: "warnOnly" })(request);
  },
};
```

## Middleware

### `createCloudflareHandler(client, options?)`

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
const handler = createCloudflareHandler(guard, {
  endpoint: (request) => new URL(request.url).pathname,
});
```

## Error Handling

- Blocked requests return a JSON `429` response.
- Allowed requests return a `200` response with an empty body.

## Production Notes

- Keep handlers stateless.
- Use edge-friendly identifiers and avoid Node-only dependencies.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
