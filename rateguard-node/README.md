# `@rateguard/node`

TypeScript SDK and CLI for RateGuard.

This package provides the core client, policy engine, plugin system, observability helpers, structured logger, typed errors, and the `rateguard` CLI.

## Installation

```bash
npm install @rateguard/node
```

## Quick Start

```ts
import { RateGuard } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .failMode("shadowMode")
  .build();

const decision = await guard.check({
  identifier: "user_123",
  endpoint: "/login",
  method: "POST",
});
```

## API Surface

### Core

- `RateGuard`
- `RateGuardBuilder`
- `createRateGuard(options)`
- `RateGuardClient`

### Policy

- `PolicyBuilder`
- `PolicyCompiler`
- `compilePolicy(policy)`
- `createPolicyCompiler(options)`
- `createPolicyTemplate(name, policy, description)`
- `getPolicyTemplate(name)`
- `listPolicyTemplates()`
- `simulatePolicy(input)`

### Plugins And Observability

- `PluginRegistry`
- `createPluginRegistry(initialPlugins)`
- `createPluginServices()`
- `ObservabilityRegistry`
- `createOpenTelemetryPlugin`
- `createPrometheusPlugin`
- `createDatadogPlugin`
- `createSentryPlugin`
- `createNewRelicPlugin`
- `createElasticPlugin`
- `createGrafanaPlugin`
- `createBackendMetricsPlugin`
- `createPluginMetricsPlugin`
- `createSdkMetricsPlugin`
- `createRedisMetricsPlugin`

### Logging

- `createLogger`
- `logDecision`
- `timeLogger`

### Errors

- `RateGuardError`
- `AuthenticationError`
- `AuthorizationError`
- `ValidationError`
- `ConfigurationError`
- `NetworkError`
- `TimeoutError`
- `RateLimitExceededError`
- `InternalServerError`
- `RedisError`
- `DatabaseError`
- `MigrationError`
- `TransportError`

### CLI

```bash
npx rateguard doctor
npx rateguard init
npx rateguard login --api-key rg_live_xxx --base-url https://rateguard-7b9988e4d5f5.herokuapp.com
npx rateguard policy validate --policy rateguard.policy.json
npx rateguard simulate --policy rateguard.policy.json --identifier user_123 --endpoint /login --method POST
```

## Builder

`RateGuard.builder()` configures the client with:

- `apiKey`
- `baseURL`
- `timeout`
- `retry`
- `failMode`
- `logger`
- `transport`
- `plugin`
- `tenantId`

## Policy Example

```ts
guard.policy("login")
  .limit(10)
  .window("1m")
  .identifier((ctx) => ctx.identifier ?? ctx.ip ?? "anonymous")
  .endpoint("/login")
  .method("POST")
  .build();

const decision = await guard.check({
  policy: "login",
  identifier: "user_123",
  endpoint: "/login",
  method: "POST",
});
```

## Middleware

```ts
const middleware = guard.middleware({
  failMode: "warnOnly",
  identifier: (req) => req.headers["x-user-id"]?.toString() ?? req.ip ?? "anonymous",
  endpoint: (req) => req.path,
  method: (req) => req.method,
});
```

The Express middleware sets rate-limit headers and calls `onDecision` when supplied.

## Errors

Use `RateLimitExceededError` when you want blocked traffic to throw, and `serializeError()` when you need a JSON-friendly payload for logs or APIs.

## Shutdown

```ts
process.on("SIGTERM", async () => {
  await guard.shutdown();
  process.exit(0);
});
```

## Production Notes

- Reuse one client per process.
- Set `baseURL` explicitly in production.
- Keep `shadowMode` for rollout testing.
- Run `npx rateguard doctor` before promoting a new environment.

## Related Docs

- [Root README](../README.md)
- [API Reference](../docs/api-reference.md)
- [CLI Reference](../docs/examples.md)
- [Security Policy](../SECURITY.md)
