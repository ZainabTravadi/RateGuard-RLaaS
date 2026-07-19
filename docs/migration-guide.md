# Migration Guide

This guide covers the current migration surface for the repository and the SDK.

## From Older Environment Names

The backend now uses `RATE_LIMIT_FAIL_MODE` as the primary fail-mode setting.

### Deprecated Pattern

```bash
RATE_LIMIT_FAIL_OPEN=false
```

### Current Pattern

```bash
RATE_LIMIT_FAIL_MODE=failClosed
```

If both `RATE_LIMIT_FAIL_MODE` and `RATE_LIMIT_FAIL_OPEN` are set, the backend treats that as a configuration error.

## From Legacy Backend URLs

The SDK and CLI accept `RATEGUARD_BASE_URL` and still fall back to `RATEGUARD_URL` when needed. Prefer `RATEGUARD_BASE_URL` in new setup scripts and deployment environments.

## From Inline Rate Limiting

If you previously kept limiter state inside each application process, move that decision logic into RateGuard policies and keep the application code focused on extracting request context.

### Before

```ts
// local limiter state
```

### After

```ts
const decision = await guard.check({
  policy: "login",
  identifier: userId,
  endpoint: "/login",
  method: "POST",
});
```

## From Unvalidated Config

The current client validates:

- API key presence
- Absolute backend URL
- Timeout
- Retry count
- Retry delay
- Fail mode

If older code depended on loose config parsing, update it to fail fast and surface the configuration error early.

## From Undocumented Policies

Policy builders now support versioning, simulation, and templates. If you are migrating a raw policy JSON file, validate it with:

```bash
npx rateguard policy validate --policy rateguard.policy.json
npx rateguard simulate --policy rateguard.policy.json --identifier user_123 --endpoint /login --method POST
```

## From Manual Shutdown

Older code often ignored transport cleanup. Call `shutdown()` or `dispose()` now so plugin hooks and transports can close cleanly.

## Related Docs

- [Installation](installation.md)
- [Quick Start](quickstart.md)
- [API Reference](api-reference.md)
- [Troubleshooting](troubleshooting.md)
