# RateGuard

RateGuard is a centralized rate-limiting platform with a Node.js SDK, framework adapters, and a Fastify backend.

## Workspace Layout

- `backend/` - Fastify API, migrations, Redis, analytics, auth, and enforcement
- `frontend/` - Dashboard UI
- `packages/*/` - Framework adapters
- `rateguard-node/` - Publishable SDK package

## Workspace Commands

```bash
npm install
npm run build
npm run test
npm run lint
```

## SDK Quick Start

```ts
import { RateGuard } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

app.use(guard.middleware());
```

## Release Channels

- `latest` for stable releases
- `beta` for prerelease validation
- `next` for release candidates
- `nightly` for automation snapshots

## Testing

- `npm test --workspace @rateguard/node`
- `npm test --workspace backend`

## Security

See [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
