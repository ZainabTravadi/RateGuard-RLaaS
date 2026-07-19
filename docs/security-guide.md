# Security Guide

This guide explains the operational security model used by the current backend and SDK.

## Authentication

- The dashboard uses authenticated routes.
- The SDK uses API keys to call the backend enforcement API.
- The backend validates requests before evaluating rate-limit decisions.

## API Keys

- Scope keys to the smallest environment possible.
- Rotate keys when a service is retired or a credential is exposed.
- Avoid copying keys into example files or screenshots.

## Secrets Management

Store these values in a secret manager or deployment environment rather than in the repository:

- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL`
- `RATEGUARD_API_KEY`
- provider-specific tokens and SMTP credentials

## Threat Model

The main risks for this repository are:

- Leaked API keys or JWT secrets
- Unexpected fail-open configuration
- Unauthorized access to dashboard and analytics data
- Mis-scoped environment variables
- Unsafe policy changes during rollout

## Rate Limiting Strategy

- Use `failClosed` for sensitive endpoints.
- Use `shadowMode` while testing policy changes.
- Keep policy identifiers stable.
- Review top attackers and top endpoints in analytics to see where pressure is coming from.

## Logging

- Prefer structured logs over free-form text.
- Redact `apiKey`, `authorization`, `x-api-key`, `token`, and `secret` fields.
- Include request IDs when you need to join SDK, backend, and dashboard events.

## Backend Hardening

- Run HTTPS in production.
- Keep PostgreSQL and Redis off the public internet.
- Apply database migrations before exposing traffic.
- Validate `RATE_LIMIT_FAIL_MODE` on startup.

## Operational Checks

- `npx rateguard doctor`
- Backend `/v1/health`
- Redis health output
- Migration status

## Responsible Disclosure

If you find a vulnerability, report it privately and wait for maintainers to confirm a patch before publishing details.

## Related Docs

- [Top-Level Security Policy](../SECURITY.md)
- [Production Deployment](production-deployment.md)
- [Troubleshooting](troubleshooting.md)
