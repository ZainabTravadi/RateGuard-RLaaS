# CLI Reference

This reference documents every command exposed by the `rateguard` CLI.

## Global Pattern

```bash
npx rateguard <command> [options]
```

The CLI reads defaults from `.rateguard.json` in the current working directory when present. You can override most values with flags or environment variables.

## Command Index

| Command | Purpose |
| --- | --- |
| `init` | Create local config and a starter policy |
| `doctor` | Validate configuration, DNS, TLS, backend, Redis, and migrations |
| `login` | Save API credentials to local config |
| `benchmark` | Measure backend latency against `/v1/health` |
| `policy` | Validate, inspect, or list policy templates |
| `analytics` | Fetch analytics overview data |
| `simulate` | Simulate a policy locally |
| `import` | Load config and policy data from a file |
| `export` | Write config and template data to a file |
| `migrate` | Run backend migrations through the workspace script |

## `init`

Creates `.rateguard.json` and `rateguard.policy.json`.

### Arguments

- None

### Options

- None

### Example

```bash
npx rateguard init
```

### Expected Output

```text
Initialized RateGuard config at <path>\.rateguard.json
```

### Common Errors

- The target directory is not writable.
- An existing config file blocks initialization.

### Use Cases

- Bootstrapping a new local project.
- Creating a starter policy file for simulation.

## `doctor`

Runs a health and configuration audit.

### Arguments

- None

### Options

- `--api-key <key>`
- `--base-url <url>`
- `--timeout <ms>`
- `--retries <count>`
- `--format json|text`

### Example

```bash
npx rateguard doctor --api-key rg_live_xxx --base-url http://localhost:4000
```

### Expected Output

- Text mode prints PASS, WARNING, and FAIL lines.
- JSON mode prints a structured report with the same checks.

### Common Errors

- Missing API key.
- Invalid backend URL.
- DNS or TLS failures.
- Backend health or migration failures.

### Use Cases

- Verifying a new installation.
- Troubleshooting backend connectivity.

## `login`

Stores credentials in `.rateguard.json`.

### Arguments

- None

### Options

- `--api-key <key>`
- `--base-url <url>`
- `--tenant <tenant>`

### Example

```bash
npx rateguard login --api-key rg_live_xxx --base-url http://localhost:4000
```

### Expected Output

```text
Saved RateGuard credentials to <path>\.rateguard.json
```

### Common Errors

- Missing `--api-key` and missing `RATEGUARD_API_KEY`.

### Use Cases

- Saving local credentials once instead of exporting env vars repeatedly.

## `benchmark`

Measures response latency against the backend health endpoint.

### Arguments

- None

### Options

- `--api-key <key>`
- `--base-url <url>`
- `--rounds <count>`

### Example

```bash
npx rateguard benchmark --rounds 5
```

### Expected Output

```json
{
  "rounds": 5,
  "averageMs": 42,
  "p95Ms": 55,
  "samples": [41, 43, 39, 55, 34]
}
```

### Common Errors

- Missing API key.
- Backend health endpoint unreachable.

### Use Cases

- Checking backend latency before a rollout.

## `policy`

Validates, shows, or lists policy templates.

### Arguments

- `validate`
- `show`
- `templates`

### Options

- `--policy <file>`
- `--template <name>`

### Example

```bash
npx rateguard policy validate --policy rateguard.policy.json
```

### Expected Output

- `validate` prints a compiled policy summary.
- `show` prints the compiled policy JSON.
- `templates` prints the built-in template list when no file is provided.

### Common Errors

- Missing or invalid policy file.
- Policy limit or window is missing.

### Use Cases

- Inspecting a local policy file before rollout.
- Listing built-in policy templates.

## `analytics`

Fetches dashboard analytics for a time range.

### Arguments

- None

### Options

- `--api-key <key>`
- `--base-url <url>`
- `--range <value>`

### Example

```bash
npx rateguard analytics --range 7d
```

### Expected Output

```json
{
  "ok": true,
  "range": "7d",
  "data": {
    "timeSeries": [],
    "allowedVsBlocked": [],
    "topEndpoints": []
  }
}
```

### Common Errors

- Authentication failure.
- Backend returns a non-2xx response.

### Use Cases

- Pulling quick operational summaries from the terminal.

## `simulate`

Simulates a policy against a local request context.

### Arguments

- None

### Options

- `--policy <file>`
- `--template <name>`
- `--context <file>`
- `--identifier <value>`
- `--endpoint <value>`
- `--method <value>`

### Example

```bash
npx rateguard simulate --policy rateguard.policy.json --identifier user_123 --endpoint /login --method POST
```

### Expected Output

```json
{
  "policy": "login",
  "version": 1,
  "hash": "abc123",
  "allowed": true,
  "effectiveLimit": 10,
  "effectiveWindow": "1m",
  "effectiveStrategy": "sliding-window",
  "warnings": [],
  "context": {
    "identifier": "user_123",
    "endpoint": "/login",
    "method": "POST"
  }
}
```

### Common Errors

- Missing policy file or template.
- Invalid context file.

### Use Cases

- Testing a policy before it is enforced.

## `import`

Imports config and policy data from a JSON file.

### Arguments

- None

### Options

- `--input <file>`
- `--file <file>`

### Example

```bash
npx rateguard import --input rateguard.export.json
```

### Expected Output

```text
Imported RateGuard state from rateguard.export.json
```

### Common Errors

- Missing input file.
- Invalid JSON payload.

### Use Cases

- Restoring local config from a previously exported file.

## `export`

Exports config and policy templates to a JSON file.

### Arguments

- None

### Options

- `--output <file>`

### Example

```bash
npx rateguard export --output rateguard.export.json
```

### Expected Output

```text
Exported RateGuard state to rateguard.export.json
```

### Common Errors

- The target path is not writable.

### Use Cases

- Archiving a known-good local configuration.

## `migrate`

Runs the backend workspace migration script.

### Arguments

- None

### Options

- None

### Example

```bash
npx rateguard migrate
```

### Expected Output

- Backend migration output is streamed directly to the terminal.

### Common Errors

- Backend workspace command fails.
- Database connectivity issues.

### Use Cases

- Applying pending backend migrations from the CLI.

## Related Docs

- [API Reference](api-reference.md)
- [Cookbook](cookbook.md)
- [Migration Guide](migration-guide.md)
- [Troubleshooting](troubleshooting.md)
