# FAQ

## Is RateGuard only for Node.js?

The core SDK is Node.js focused, but the workspace also includes adapters for Fastify, NestJS, Next.js, Koa, Hono, Bun, Deno, and Cloudflare Workers.

## Do I need Redis?

Production deployments should use Redis. In development, the backend can fall back to an in-memory mock when `REDIS_URL` is not set.

## What does the dashboard show?

The dashboard includes overview, analytics, logs, rules, integrations, settings, notifications, docs, and authentication pages.

## What is the difference between `check` and `limit`?

`check()` returns the decision. `limit()` returns the same decision shape but throws `RateLimitExceededError` when the request is blocked.

## What is `shadowMode`?

`shadowMode` evaluates policy decisions without hard blocking traffic. It is the safest mode for testing a new policy.

## Why does `doctor` fail on TLS?

The backend URL is either not HTTPS or the certificate chain is invalid. Fix the certificate, hostname, or proxy configuration.

## Why am I seeing a mock Redis warning?

The backend is running without `REDIS_URL` in development. Set a real Redis URL before promoting the service to production.

## How do I report a bug?

Open an issue and include the CLI output, environment variables, and the `doctor` report when relevant.

## Related Docs

- [Installation](installation.md)
- [Quick Start](quickstart.md)
- [Troubleshooting](troubleshooting.md)
- [Security Guide](security-guide.md)
