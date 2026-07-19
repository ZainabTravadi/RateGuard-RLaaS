# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning for published packages.

## [Unreleased]

### Added

- Comprehensive documentation for the SDK, CLI, framework adapters, deployment, and security.

### Changed

- The root README was rewritten as a full project landing page.
- Top-level documentation now uses one consistent technical style and terminology.

### Fixed

- Removed stale references to older SDK and CLI guidance from the documentation set.

## [1.0.0] - 2026-07-19

### Added

- Typed `RateGuard` builder and client APIs.
- Programmatic policy building, compilation, simulation, and diff support.
- CLI commands for `doctor`, `init`, `login`, `benchmark`, `policy`, `analytics`, `simulate`, `import`, `export`, and `migrate`.
- Framework adapters for Express, Fastify, NestJS, Next.js, Koa, Hono, Bun, Deno, and Cloudflare Workers.
- Backend enforcement endpoints at `/v1/check` and `/v1/health`.
- Dashboard surfaces for overview, analytics, logs, rules, notifications, integrations, settings, and auth flows.

### Changed

- Introduced explicit fail modes and typed error classes.
- Added structured logging, request IDs, and redaction defaults.
- Added mock Redis fallback for development when no `REDIS_URL` is configured.

### Fixed

- Replaced placeholder documentation with implementation-aligned guidance.

## [0.1.0] - 2026-07-19

### Added

- Early monorepo scaffolding for the backend, frontend, SDK, and framework packages.
