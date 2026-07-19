# Performance Guide

RateGuard is designed to keep the hot path predictable. Most tuning happens through client configuration, policy design, and backend placement.

## Client Tuning

- Reuse a single `RateGuard` instance per application process.
- Keep timeouts conservative enough to fail fast, but not so low that normal backend latency causes timeouts.
- Use a small retry count with jittered backoff for transient network failures.
- Prefer `shadowMode` for policy rollout so you can observe cost before enforcement.

## Policy Tuning

- Keep policy trees shallow unless you need nested rules.
- Avoid unnecessary conditions in high-traffic policies.
- Use `PolicyCompiler.simulate()` to validate the effective limit and matched rule before rollout.
- Use explicit `window` values that match the shape of your traffic.

## Backend Tuning

- Run the backend close to PostgreSQL and Redis.
- Monitor `/v1/health` and `npx rateguard doctor` latency output.
- Treat `REDIS_URL` as mandatory in production.
- Confirm that migrations stay at zero pending before rollout.

## Logging And Metrics

- Set logger sampling when you want lower-volume logs.
- Use observability plugins instead of synchronous custom exporters in request handlers.
- Keep dashboards focused on request rates, blocked requests, and top attack surfaces.

## Related Docs

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Production Deployment](production-deployment.md)
- [Best Practices](best-practices.md)
