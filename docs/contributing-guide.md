# Contributing Guide

This guide expands on the top-level contribution policy with the day-to-day workflow for the repository.

## Repository Setup

```bash
npm install
npm run build
npm run test
```

## Development Workflow

1. Pick the package or area you plan to change.
2. Read the related docs before editing code.
3. Add or update tests alongside behavior changes.
4. Run the smallest relevant workspace command first.
5. Verify docs and examples before opening a pull request.

## Coding Standards

- Keep public APIs typed and explicit.
- Prefer small, reviewable functions.
- Match the surrounding style instead of introducing a new one.
- Do not commit secrets, generated credentials, or local cache files.

## Testing

- `npm run test --workspace rateguard-node`
- `npm run test --workspace backend`
- `npm run build`

When a change touches a public example, confirm that the example still matches the current API surface.

## Commit Conventions

Use concise commit messages that describe the intent:

- `sdk: add policy simulation example`
- `backend: document health checks`
- `docs: normalize framework guides`

## Release Process

The repository uses Changesets for package releases.

1. Add a changeset for user-visible package changes.
2. Update any release notes or changelog entries.
3. Run the relevant release script only when the release is ready.

## Branch Strategy

- Keep feature branches scoped to one concern.
- Prefer rebasing or merging cleanly before review.
- Avoid large unrelated formatting changes in the same pull request.

## Issue Workflow

- Search existing issues first.
- Include reproduction steps and the exact command you ran.
- Attach `doctor` output for backend or SDK setup issues.

## PR Checklist

- Public behavior is documented.
- Tests pass for the touched workspace.
- Examples compile or are validated against the current API.
- Security-sensitive values are not exposed in logs or screenshots.
- The change description explains what changed and why.

## Related Docs

- [Top-Level Contributing](../CONTRIBUTING.md)
- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Troubleshooting](troubleshooting.md)
