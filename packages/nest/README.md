# `@rateguard/nest`

NestJS helpers for the RateGuard SDK.

This package exposes an injectable middleware class and a `CanActivate` guard.

## Installation

Install workspace dependencies from the repository root:

```bash
npm install
```

## Quick Start

```ts
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { RateGuard, RateGuardMiddleware } from "@rateguard/nest";

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const guard = RateGuard.builder()
      .apiKey(process.env.RATEGUARD_API_KEY ?? "")
      .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
      .build();

    consumer.apply(new RateGuardMiddleware(guard, { failMode: "warnOnly" })).forRoutes("*");
  }
}
```

## Middleware And Guard

### `RateGuardMiddleware`

An injectable `NestMiddleware` implementation that evaluates a request before it reaches the route handler.

### `RateGuardGuard`

A `CanActivate` guard that returns `true` for allowed requests and `false` when the request should be blocked.

## Configuration

Both classes accept the standard middleware options:

- `identifier`
- `endpoint`
- `method`
- `tenantId`
- `headers`
- `smartMode`
- `failMode`

## Example

```ts
@Injectable()
export class ProtectedGuard extends RateGuardGuard {}
```

## Error Handling

- The middleware throws `UnauthorizedException` for blocked requests unless the fail mode allows pass-through.
- The guard returns a boolean, so use it when you want route-level authorization-style checks.

## Production Notes

- Prefer the middleware for broad protection and the guard for route-specific checks.
- Keep request-derived identifiers stable across clustered deployments.

## Related Docs

- [SDK Reference](../../docs/api-reference.md)
- [Framework Guides](../../docs/framework-guides.md)
