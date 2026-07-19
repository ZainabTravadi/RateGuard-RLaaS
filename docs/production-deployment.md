# Production Deployment

This guide covers the deployment shapes supported by the current repository.

## Shared Requirements

- Node.js 18 or newer
- PostgreSQL
- Redis for production enforcement
- `DATABASE_URL`
- `JWT_SECRET`
- `RATE_LIMIT_FAIL_MODE`

## Docker

Use Docker when you want a repeatable runtime with explicit service boundaries.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "start", "--workspace", "backend"]
```

## Docker Compose

Docker Compose is the easiest way to bring up the backend with PostgreSQL and Redis together.

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
  redis:
    image: redis:7
  backend:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/rateguard
      REDIS_URL: redis://redis:6379
      JWT_SECRET: replace-me
      RATE_LIMIT_FAIL_MODE: failClosed
```

## Railway

- Set the backend service as a Node.js app.
- Provision PostgreSQL and Redis managed services.
- Add the shared environment variables.
- Run migrations before exposing the service.

## Render

- Deploy the backend as a web service.
- Add PostgreSQL and Redis add-ons or external managed services.
- Set the fail mode and JWT secret in Render environment settings.
- Confirm the health endpoint is reachable before cutting over traffic.

## Fly.io

- Deploy the backend as a Fly app.
- Attach PostgreSQL and Redis in the same region when possible.
- Set `PORT` to the value Fly exposes.
- Confirm that the health check path returns `200` before scaling.

## Vercel

Vercel is best used for the dashboard or documentation front end. Host the backend on a Node-friendly platform such as Fly.io, Render, Railway, or a container host.

## AWS

- Run the backend on ECS, EC2, or App Runner.
- Put PostgreSQL on RDS and Redis on ElastiCache or an equivalent managed service.
- Put the backend behind an ALB or API Gateway-compatible proxy.

## DigitalOcean

- Use a Droplet, App Platform, or Kubernetes depending on your team size.
- Keep the backend close to PostgreSQL and Redis.
- Terminate TLS at a reverse proxy or managed load balancer.

## Self-Hosting

Self-hosting is fine if you can manage patching, backups, secrets, and observability.

- Install Node.js 18+
- Provide PostgreSQL and Redis
- Run migrations before first traffic
- Confirm process restarts and health probes

## Reverse Proxy

If you place the backend behind Nginx, Caddy, or Traefik:

- Preserve `X-Request-Id`
- Forward the original host and scheme
- Keep timeouts high enough for health checks
- Avoid caching authenticated API responses

## Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Token signing secret |
| `REDIS_URL` | Yes in production | Redis connection string |
| `PORT` | No | Backend port |
| `RATE_LIMIT_FAIL_MODE` | Yes | `failClosed`, `failOpen`, `warnOnly`, or `shadowMode` |
| `API_URL` | No | Public backend URL |
| `DEFAULT_ENV_BASE_URL` | No | Default dashboard base URL for a production environment |

## Production Checklist

- [ ] Migrations applied
- [ ] `doctor` passes against the deployed backend
- [ ] Redis health is green
- [ ] TLS is enabled
- [ ] `RATE_LIMIT_FAIL_MODE` is set intentionally
- [ ] Secrets are stored outside the repository
- [ ] Logs redact secrets
- [ ] Alerts exist for backend and Redis failures
- [ ] Dashboard and backend URLs are configured correctly

## Related Docs

- [Installation](installation.md)
- [Architecture](architecture.md)
- [Security Guide](security-guide.md)
- [Troubleshooting](troubleshooting.md)
