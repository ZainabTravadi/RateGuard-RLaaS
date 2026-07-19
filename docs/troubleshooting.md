# Troubleshooting

## `ConfigurationError: RATEGUARD_API_KEY is missing`

Set `RATEGUARD_API_KEY` before constructing the SDK or running the CLI.

```bash
set RATEGUARD_API_KEY=rg_live_xxx
```

## `Invalid baseURL`

Use an absolute `http://` or `https://` URL for `baseURL`. Relative URLs are rejected.

## `doctor` reports DNS or TLS failures

- Confirm the backend hostname is correct.
- Confirm the certificate chain is valid.
- Confirm the backend is reachable from the machine running `doctor`.

## `Rate limit exceeded`

The policy is working as intended. Check the returned `retryAfter`, `policy`, `ruleId`, and `requestId` values before deciding whether to retry.

## `RateGuardClient has been disposed`

Create a new client instance. Once `shutdown()` or `dispose()` runs, the client is closed.

## Backend starts but health checks are degraded

- Verify `DATABASE_URL`.
- Verify `JWT_SECRET`.
- Confirm `RATE_LIMIT_FAIL_MODE` is set.
- If you expect Redis in production, confirm `REDIS_URL`.

## CLI returns `Unknown command`

Valid commands are `doctor`, `init`, `login`, `benchmark`, `policy`, `analytics`, `simulate`, `import`, `export`, and `migrate`.

## Policy simulation looks wrong

- Ensure the policy file contains a positive `limit` and a `window`.
- Check that the request context matches the rule conditions.
- Use `npx rateguard policy show` to inspect the compiled result.

## Related Docs

- [Installation](installation.md)
- [Quick Start](quickstart.md)
- [API Reference](api-reference.md)
- [Security Guide](security-guide.md)
