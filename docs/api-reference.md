# API Reference

This reference documents the public SDK, policy, plugin, logging, observability, and lifecycle APIs exposed by `@rateguard/node`.

## Package Entry Points

```ts
import {
  RateGuard,
  RateGuardClient,
  PolicyBuilder,
  PolicyCompiler,
  createLogger,
  createRateGuard,
  createPolicyCompiler,
  compilePolicy,
  simulatePolicy,
  SDK_VERSION,
} from "@rateguard/node";
```

## Configuration

`RateGuard.builder()` resolves the following client options:

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required API key |
| `baseURL` | `string` | Backend URL, defaults to `RATEGUARD_BASE_URL`, `RATEGUARD_URL`, or `https://rateguard-7b9988e4d5f5.herokuapp.com` |
| `timeout` | `number` | Request timeout in milliseconds |
| `retries` | `number` | Number of retry attempts |
| `retryDelayMs` | `number` | Base retry delay in milliseconds |
| `failMode` | `FailMode` | `failClosed`, `failOpen`, `warnOnly`, or `shadowMode` |
| `tenantId` | `string` | Optional tenant scope |
| `documentationURL` | `string` | Override for error docs links |
| `userAgent` | `string` | Custom user agent |
| `logger` | `RateGuardLogger` | Logger adapter |
| `transport` | `RateGuardTransport` | Custom transport |
| `plugins` | `RateGuardPlugin[]` | Initial plugin list |

### Environment Variables

- `RATEGUARD_API_KEY`
- `RATEGUARD_BASE_URL`
- `RATEGUARD_URL`
- `RATEGUARD_TENANT_ID`

## Builder API

`RateGuard.builder()` returns a `RateGuardBuilder`.

| Method | Description |
| --- | --- |
| `apiKey(value)` | Set the API key |
| `baseURL(value)` | Set the backend URL |
| `timeout(ms)` | Set the request timeout |
| `retry(count, retryDelayMs?)` | Set retry count and optional delay |
| `failMode(mode)` | Set the default fail mode |
| `logger(logger)` | Attach a logger |
| `transport(transport)` | Attach a custom transport |
| `plugin(plugin)` | Add a plugin before build |
| `tenantId(value)` | Set a tenant scope |
| `build()` | Create the `RateGuard` instance |

```ts
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .timeout(5000)
  .retry(2, 150)
  .failMode("failClosed")
  .build();
```

## RateGuardClient

`RateGuardClient` sends requests to the backend and can also be used directly if you want to bypass the higher-level `RateGuard` wrapper.

### Methods

| Method | Description |
| --- | --- |
| `check(options)` | Returns a `RateLimitResult` |
| `limit(options)` | Throws `RateLimitExceededError` on a blocked decision |
| `middleware(options?)` | Returns Express middleware |
| `close()` | Closes the underlying transport |
| `dispose()` | Alias for `close()` |

### Example

```ts
import { RateGuardClient } from "@rateguard/node";

const client = new RateGuardClient({
  apiKey: process.env.RATEGUARD_API_KEY ?? "",
  baseURL: process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com",
});

const result = await client.check({
  identifier: "user_123",
  endpoint: "/login",
  method: "POST",
});
```

## Middleware

`RateGuard.middleware()` and `RateGuardClient.middleware()` both return Express-compatible middleware.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `identifier` | string or resolver | Identity used for the decision |
| `endpoint` | string or resolver | Endpoint key sent to the backend |
| `method` | string or resolver | HTTP method |
| `skip` | function | Skip logic for selected requests |
| `tenantId` | string or resolver | Optional tenant scope |
| `headers` | object or resolver | Extra headers for the request |
| `smartMode` | boolean | Enables smart-mode evaluation |
| `failMode` | `FailMode` | Overrides the client default |
| `onDecision` | function | Observes the decision |
| `onError` | function | Handles middleware failures |

```ts
app.use(
  guard.middleware({
    identifier: (req) => req.headers["x-user-id"]?.toString() ?? req.ip ?? "anonymous",
    endpoint: (req) => req.path,
    method: (req) => req.method,
    failMode: "warnOnly",
  })
);
```

## RateGuard

The `RateGuard` wrapper combines the client with local policy storage, plugins, and analytics.

### Methods

| Method | Description |
| --- | --- |
| `use(plugin)` | Register a plugin |
| `policy(name)` | Create a policy builder |
| `check(input?)` | Evaluate a request or policy-scoped input |
| `limit(input?)` | Throw on blocked decisions |
| `middleware(options?)` | Express middleware helper |
| `analytics()` | Return local analytics snapshots |
| `health()` | Check the backend health endpoint |
| `shutdown()` | Run shutdown hooks and dispose the client |
| `dispose()` | Alias for `shutdown()` |
| `pluginRegistry()` | Access the plugin registry |

### Example

```ts
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .build();

const decision = await guard.check({
  identifier: "user_123",
  endpoint: "/login",
  method: "POST",
});
```

## Policy Builder

`guard.policy(name)` returns a `PolicyBuilder` that writes into the local policy registry.

### Common Methods

| Method | Description |
| --- | --- |
| `limit(value)` | Set the policy limit |
| `window(value)` | Set the policy window |
| `identifier(resolver)` | Resolve the identifier from context |
| `endpoint(value)` | Set or resolve the endpoint |
| `method(value)` | Set or resolve the HTTP method |
| `failMode(value)` | Set the policy fail mode |
| `smartMode(value)` | Enable smart mode |
| `description(value)` | Add documentation text |
| `version(value)` | Set the policy version |
| `priority(value)` | Set the policy priority |
| `enabled(value)` | Enable or disable the policy |
| `parentPolicy(value)` | Reference a parent policy |
| `fallbackPolicy(value)` | Reference a fallback policy |
| `template(value)` | Mark the policy template name |
| `strategy(value)` | Set one or more strategies |
| `logic(value)` | Set group logic |
| `shadow(value)` | Enable shadow evaluation |
| `simulate(value)` | Enable simulation mode |
| `metadata(value)` | Attach metadata |
| `conditions(value)` | Add condition groups |
| `rule(value)` / `rules(values)` | Add one or more rules |
| `weight(value)` | Set weighted rule behavior |
| `burst(value)` | Set burst behavior |
| `concurrency(value)` | Set concurrency behavior |
| `cost(value)` | Set rule cost |
| `countries(values)` | Restrict to countries |
| `regions(values)` | Restrict to regions |
| `tiers(values)` | Restrict to tiers |
| `workspaceId(value)` | Scope to a workspace |
| `projectId(value)` | Scope to a project |
| `environmentId(value)` | Scope to an environment |
| `build()` | Return the current draft |

```ts
guard.policy("login")
  .limit(10)
  .window("1m")
  .identifier((ctx) => ctx.identifier ?? ctx.ip ?? "anonymous")
  .strategy("sliding-window")
  .build();
```

## Policy Engine

`PolicyCompiler` compiles, validates, optimizes, diffs, and simulates policy definitions.

### Functions

- `compilePolicy(policy, resolvePolicy?)`
- `simulatePolicy(input, resolvePolicy?)`
- `createPolicyCompiler(options?)`
- `createPolicyTemplate(name, policy, description)`
- `getPolicyTemplate(name)`
- `listPolicyTemplates()`

### Example

```ts
import { createPolicyCompiler, simulatePolicy } from "@rateguard/node";

const compiler = createPolicyCompiler();
const compiled = compiler.compile({
  name: "login",
  limit: 10,
  window: "1m",
});

const preview = compiler.simulate({
  policy: compiled.policy,
  context: {
    identifier: "user_123",
    endpoint: "/login",
    method: "POST",
  },
});
```

## Plugins

Plugins are lifecycle-aware and can register services, commands, and hooks.

### Hooks

- `beforeInit`
- `afterInit`
- `beforeRequest`
- `afterRequest`
- `beforeDecision`
- `afterDecision`
- `beforeShutdown`
- `afterShutdown`

### Services

Plugins can register middleware, commands, storage, transport, logger, and telemetry services through the plugin registry.

### Example

```ts
const plugin = {
  name: "decision-logger",
  afterRequest(ctx) {
    ctx.services.logger?.info?.("decision", {
      policy: ctx.request?.policy,
      allowed: ctx.result?.allowed,
    });
  },
};
```

## Logging

`createLogger()` returns a structured logger with redaction support.

### Options

| Option | Description |
| --- | --- |
| `format` | `json`, `pretty`, or `silent` |
| `redact` | Array of keys to redact |
| `debug` | Enable debug output |
| `trace` | Reserved for future trace formatting |
| `sampleRate` | Sampling ratio between 0 and 1 |
| `level` | Minimum log level |
| `context` | Base log context |
| `adapter` | External logger adapter |
| `bindings` | Extra bindings |

### Example

```ts
const logger = createLogger({
  format: "pretty",
  redact: ["apiKey", "authorization"],
  level: "info",
});
```

## Errors

The SDK exports typed errors with serialized metadata.

### Classes

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

### Helpers

- `isRateGuardError(error)`
- `serializeError(error)`
- `formatError(error, format?)`

### Error Fields

| Field | Description |
| --- | --- |
| `code` | Machine-readable error code |
| `status` | HTTP status |
| `requestId` | Request identifier, when available |
| `retryAfter` | Suggested retry delay |
| `backend` | Backend URL or backend label |
| `retryable` | Whether the error is safe to retry |
| `details` | Structured context |
| `causes` | Human-readable causes |
| `fixes` | Human-readable fixes |

## Analytics

`RateGuard.analytics()` returns a local snapshot of policy decisions recorded by the SDK instance.

```ts
const analytics = guard.analytics();
console.log(analytics.snapshot());
console.log(analytics.summary());
console.log(analytics.export());
```

## Observability

The observability helpers expose registry and exporter utilities:

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
- `createCustomExporter`
- `createOpenTelemetryExporter`
- `createPrometheusExporter`
- `createDatadogExporter`
- `createGrafanaExporter`
- `createElasticExporter`
- `createNewRelicExporter`
- `createSentryExporter`
- `registerExporter`
- `registerMetric`
- `registerSpan`

## Shutdown

Call `shutdown()` or `dispose()` when the process is exiting. This runs plugin shutdown hooks and closes the transport.

```ts
process.on("SIGTERM", async () => {
  await guard.shutdown();
  process.exit(0);
});
```

## Environment Variables

| Variable | Used By | Notes |
| --- | --- | --- |
| `RATEGUARD_API_KEY` | SDK and CLI | Required unless passed explicitly |
| `RATEGUARD_BASE_URL` | SDK and CLI | Primary backend URL |
| `RATEGUARD_URL` | SDK and CLI | Fallback backend URL |
| `RATEGUARD_TENANT_ID` | SDK and CLI | Optional tenant scope |

## Best Practices

- Keep policy names stable.
- Use explicit tenant IDs for scoped traffic.
- Choose `failClosed` or `shadowMode` deliberately.
- Prefer `check()` when you want to inspect the result without throwing.
- Use `limit()` when you want blocked traffic to raise an exception.

## Performance Tips

- Reuse the same client across requests.
- Keep retry counts low.
- Set a realistic timeout.
- Use the CLI `benchmark` command to check backend response times before rollout.

## Troubleshooting

- Run `npx rateguard doctor` when configuration or connectivity is unclear.
- If the backend rejects requests, confirm the API key and base URL.
- If a policy appears too permissive, simulate it before enforcing it.
- If middleware fails open unexpectedly, confirm the configured fail mode.

## Related Docs

- [Examples](examples.md)
- [Cookbook](cookbook.md)
- [Migration Guide](migration-guide.md)
- [Troubleshooting](troubleshooting.md)
