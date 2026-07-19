# Contributing

Thanks for helping improve RateGuard. This repository is a monorepo, so the safest contributions are the ones that keep the SDK, backend, dashboard, and documentation aligned.

## Repository Setup

```bash
npm install
npm run build
npm run test
```

If you are working on one package, build and test that workspace directly as well:

```bash
npm run build --workspace rateguard-node
npm run test --workspace rateguard-node
npm run build --workspace backend
```

## Development Workflow

1. Make a focused branch for the change.
2. Update code and documentation together when public behavior changes.
3. Add tests for behavioral changes.
4. Run the relevant workspace build and test commands.
5. Verify examples in the README or docs if the public API changed.

## Coding Standards

- Prefer explicit APIs over hidden behavior.
- Keep logging structured and redacted.
- Preserve TypeScript types in public packages.
- Avoid breaking changes unless the work is explicitly scoped as such.
- Match existing formatting and naming in the surrounding package.

## Commit Conventions

Use short, descriptive commit messages:

- `docs: rewrite installation guide`
- `sdk: tighten timeout validation`
- `backend: improve health diagnostics`
- `cli: document policy simulation`

## Testing

Run the smallest useful test scope first, then the broader workspace checks:

```bash
npm run test --workspace rateguard-node
npm run test --workspace backend
npm run test
```

If you change a public API, include one or more examples that compile against the new behavior.

## Release Process

The monorepo uses Changesets and the release scripts at the root:

```bash
npm run changeset
npm run version
npm run release:stable
```

Release branches should only include changes that are ready to publish and documented.

## Branch Strategy

- `main` should stay releasable.
- Feature branches should be small and reviewable.
- Use draft pull requests when a change needs feedback before merge.

## Issue Workflow

- Open one issue per problem or enhancement.
- Include the command, environment, and expected behavior.
- Attach `npx rateguard doctor` output for SDK or backend setup issues.

## Pull Request Checklist

- The change is scoped and explained clearly.
- Tests were added or updated where behavior changed.
- Docs were updated where public behavior changed.
- Examples still match the current API.
- Secrets, tokens, and credentials are not included in diffs or logs.

## Helpful References

- [README](README.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Contributing Guide](docs/contributing-guide.md)
- [Security Policy](SECURITY.md)
