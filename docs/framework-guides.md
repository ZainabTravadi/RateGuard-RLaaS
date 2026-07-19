# Framework Guides

RateGuard includes adapters for common web frameworks and runtimes. Each package keeps the same decision model while matching the runtime's native middleware shape.

## Support Matrix

| Framework | Package | Runtime Shape | Typical Use |
| --- | --- | --- | --- |
| Express | `@rateguard/express` | `RequestHandler` | Traditional Node applications |
| Fastify | `@rateguard/fastify` | `onRequest` hook | Fastify services and APIs |
| NestJS | `@rateguard/nest` | Middleware / guard | Decorator-based services |
| Next.js | `@rateguard/next` | Middleware function | App router and edge middleware |
| Koa | `@rateguard/koa` | Middleware | Koa applications |
| Hono | `@rateguard/hono` | Middleware | Edge-first HTTP services |
| Bun | `@rateguard/bun` | Request handler | Bun-native apps |
| Deno | `@rateguard/deno` | Request handler | Deno Deploy and Deno CLI apps |
| Cloudflare | `@rateguard/cloudflare` | Worker handler | Cloudflare Workers |

## Shared Pattern

1. Create a `RateGuard` client.
2. Pass request-derived identifiers, endpoints, and methods into the adapter.
3. Choose the fail mode that matches the route.
4. Add `onDecision` or framework-native logging if you need extra telemetry.

## Package References

- [Express README](../packages/express/README.md)
- [Fastify README](../packages/fastify/README.md)
- [NestJS README](../packages/nest/README.md)
- [Next.js README](../packages/next/README.md)
- [Koa README](../packages/koa/README.md)
- [Hono README](../packages/hono/README.md)
- [Bun README](../packages/bun/README.md)
- [Deno README](../packages/deno/README.md)
- [Cloudflare README](../packages/cloudflare/README.md)

## Production Notes

- Prefer a single client instance per service process.
- Use explicit identifiers rather than anonymous defaults for authenticated traffic.
- Keep `shadowMode` on during rollout if you want to observe decisions before enforcing them.

## Related Docs

- [API Reference](api-reference.md)
- [Examples](examples.md)
- [Best Practices](best-practices.md)
