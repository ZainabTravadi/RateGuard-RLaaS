# Security Policy

## Supported Versions

We support the current monorepo release line and the currently maintained SDK and backend package versions.

When a security issue affects multiple packages, the fix should land in the shared implementation first and then be propagated to the adapters and docs that depend on it.

## Reporting Vulnerabilities

Use the repository's private vulnerability reporting flow or open a private security advisory. Do not post exploit details in a public issue.

Include:

- A short description of the issue
- Affected package or service
- Reproduction steps
- Environment details
- Any relevant request IDs, logs, or screenshots

## Security Architecture

- The SDK validates configuration before making requests.
- API keys are required for backend checks.
- Request IDs and correlation IDs are attached to responses where applicable.
- Logs redact common secret fields by default.
- The backend checks authentication and rate-limited routes separately.

## Authentication

- The backend uses JWT-based auth for dashboard and API routes.
- API keys are used by the SDK and CLI to reach the enforcement API.
- Keys should be scoped to the minimum environment or workspace needed for the task.

## API Keys

- Treat API keys as secrets.
- Rotate keys when a credential is exposed or no longer needed.
- Do not commit keys into policy files, examples, or logs.
- Prefer per-environment keys over a shared all-purpose key.

## Secrets Management

- Keep `JWT_SECRET`, database credentials, Redis credentials, and provider tokens in a secret store or environment manager.
- Never hard-code secrets in frontend code or in the repository.
- Redact secrets in structured logs and error reports before sharing them externally.

## Threat Model

The most relevant threats for this repository are:

- Credential leakage
- Misconfigured fail-open behavior
- Stale or unauthorized API keys
- Improper environment scoping
- Unchecked policy changes
- Exposure of internal diagnostics in logs

## Rate Limiting Strategy

- Use `failClosed` for security-sensitive paths.
- Use `shadowMode` when rolling out policy changes.
- Keep identifiers stable and specific.
- Review blocked-request analytics to detect bursts, abuse, or bot traffic.

## Responsible Disclosure

Please give maintainers time to validate and patch the issue before publishing details. If you need a coordinated disclosure timeline, include it in the initial report.

## Related Docs

- [Security Guide](docs/security-guide.md)
- [Troubleshooting](docs/troubleshooting.md)
- [API Reference](docs/api-reference.md)
