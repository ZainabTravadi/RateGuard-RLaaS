# Quickstart

```ts
import { RateGuard } from "@rateguard/node";

const rg = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY!)
  .baseURL(process.env.RATEGUARD_BASE_URL!)
  .failMode("failClosed")
  .build();

rg.policy("login").limit(10).window("1m").identifier((ctx) => ctx.ip || "anonymous");

app.use(rg.middleware());
```

## Common mistakes

- Forgetting `apiKey`
- Pointing `baseURL` at the wrong environment
- Registering a policy but never matching it in the request context

## Production notes

- Use `failClosed` for security-sensitive paths.
- Use `shadowMode` while rolling out a new policy.

