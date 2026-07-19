# Cookbook

Practical patterns that match the current SDK and backend implementation.

## Protect A Login Route

```ts
const decision = await guard.check({
  policy: "login",
  identifier: userId,
  endpoint: "/login",
  method: "POST",
});

if (!decision.allowed) {
  return res.status(429).json({
    error: "Rate limit exceeded",
    retryAfter: decision.retryAfter,
    requestId: decision.requestId,
  });
}
```

## Add Middleware With A Skip Rule

```ts
app.use(
  guard.middleware({
    skip: (req) => req.path.startsWith("/health"),
    failMode: "warnOnly",
  })
);
```

## Roll Out A Policy In Shadow Mode

```ts
guard.policy("checkout")
  .limit(25)
  .window("1m")
  .shadow(true)
  .simulate(true)
  .build();
```

The policy is evaluated, but it is safest to keep `shadowMode` on at the client or route level until you trust the traffic pattern.

## Inspect Analytics In Code

```ts
const analytics = guard.analytics();
console.log(analytics.summary());
```

Use the summary output when you need a quick view of blocked versus allowed requests by policy.

## Build A Custom Logger

```ts
import { createLogger } from "@rateguard/node";

const logger = createLogger({
  format: "pretty",
  level: "info",
  redact: ["apiKey", "authorization"],
});
```

## Use A Custom Transport

```ts
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .transport({
    async send(request) {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: request.signal,
      });

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.json().catch(() => null),
      };
    },
  })
  .build();
```

## Register An Observability Plugin

```ts
import { createPrometheusPlugin } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "https://rateguard-7b9988e4d5f5.herokuapp.com")
  .plugin(createPrometheusPlugin({ serviceName: "api" }))
  .build();
```

## Run A Health Check On Startup

```ts
const health = await guard.health();
if (!health.ok) {
  throw new Error("RateGuard backend is not healthy");
}
```

## Graceful Shutdown

```ts
process.on("SIGTERM", async () => {
  await guard.shutdown();
  process.exit(0);
});
```

## CLI Workflow

```bash
npx rateguard init
npx rateguard login --api-key rg_live_xxx --base-url https://rateguard-7b9988e4d5f5.herokuapp.com
npx rateguard policy validate --policy rateguard.policy.json
npx rateguard simulate --policy rateguard.policy.json --identifier user_123 --endpoint /login --method POST
npx rateguard doctor
```

## Related Docs

- [Examples](examples.md)
- [API Reference](api-reference.md)
- [Best Practices](best-practices.md)
- [Performance Guide](performance-guide.md)
