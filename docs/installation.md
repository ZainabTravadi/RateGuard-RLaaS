# Installation

This guide covers the minimum setup for the Node.js SDK, the backend service, and local workspace development.

## Requirements

- Node.js 18 or newer
- npm 11 or newer
- PostgreSQL for the backend
- Redis for production enforcement and analytics

## Install The SDK

```bash
npm install @rateguard/node
```

## Install The Workspace

```bash
npm install
npm run build
```

## Backend Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Session and auth token signing |
| `PORT` | No | Backend port, defaults to `4000` |
| `REDIS_URL` | No in development, yes in production | Redis connection string |
| `RATE_LIMIT_FAIL_MODE` | Yes | `failClosed`, `failOpen`, `warnOnly`, or `shadowMode` |
| `API_URL` | No | Public backend URL used by the dashboard |
| `DEFAULT_ENV_BASE_URL` | No | Default production environment URL |
| `DEFAULT_DEV_ENV_BASE_URL` | No | Default development environment URL |

## SDK Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `RATEGUARD_API_KEY` | Yes | API key used by the SDK and CLI |
| `RATEGUARD_BASE_URL` | Yes | Backend base URL |
| `RATEGUARD_TENANT_ID` | No | Optional tenant scope |

## Local Backend Setup

1. Install dependencies at the repository root.
2. Provide `DATABASE_URL`, `JWT_SECRET`, and `RATE_LIMIT_FAIL_MODE`.
3. Start the backend with `npm run dev --workspace backend`.
4. Confirm the backend responds at `/v1/health`.
5. Run `npx rateguard doctor` against the same backend URL.

```bash
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/rateguard
set JWT_SECRET=replace-me
set RATE_LIMIT_FAIL_MODE=failClosed
npm run dev --workspace backend
```

## Local SDK Setup

```ts
import { RateGuard } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

const health = await guard.health();
console.log(health.ok);
```

## Verification

After installation, verify the setup with:

```bash
npx rateguard doctor --api-key $RATEGUARD_API_KEY --base-url $RATEGUARD_BASE_URL
```

If the backend is healthy, `doctor` should report:

- Valid configuration
- Node.js 18+
- DNS resolution
- TLS success for HTTPS backends
- Backend health
- Redis status
- Migration status

## Related Docs

- [Quick Start](quickstart.md)
- [API Reference](api-reference.md)
- [Production Deployment](production-deployment.md)
- [Troubleshooting](troubleshooting.md)
