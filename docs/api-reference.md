# API Reference

## `RateGuard.builder()`

Creates a fluent builder.

## `RateGuard`

Supports:

- `use(plugin)`
- `policy(name)`
- `limit(input)`
- `middleware()`
- `analytics()`
- `health()`
- `shutdown()`

## `RateGuardPlugin`

Lifecycle hooks:

- `beforeInit`
- `afterInit`
- `beforeRequest`
- `afterRequest`
- `beforeShutdown`
- `afterShutdown`

