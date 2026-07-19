# Best Practices

Use RateGuard in a way that keeps policy, telemetry, and deployment behavior easy to reason about.

## Policy Design

- Name policies after user journeys or business operations.
- Keep identifiers stable across requests and deployments.
- Prefer small, explicit policies over one large catch-all policy.
- Use `shadowMode` when introducing new traffic rules.
- Store policy definitions in version control when possible.

## Runtime Behavior

- Create one `RateGuard` client per process or runtime isolate.
- Always call `shutdown()` during graceful process exit.
- Treat `failClosed` as the default for security-sensitive routes.
- Use `warnOnly` or `shadowMode` only when temporary visibility is more important than blocking.

## Logging And Observability

- Use structured logs instead of free-form messages.
- Redact API keys, bearer tokens, and other secrets.
- Prefer plugins for metrics and tracing instead of custom one-off instrumentation.

## API Usage

- Set a `tenantId` whenever a policy is tenant-scoped.
- Provide explicit `identifier`, `endpoint`, and `method` values when checking a request outside middleware.
- Handle `RateLimitExceededError` separately from network and configuration errors.

## Related Docs

- [API Reference](api-reference.md)
- [Performance Guide](performance-guide.md)
- [Security Guide](security-guide.md)
- [Troubleshooting](troubleshooting.md)
