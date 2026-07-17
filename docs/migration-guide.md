# Migration Guide

## From Phase 1

Replace:

```ts
const client = new RateGuardClient(...)
```

With:

```ts
const rg = RateGuard.builder().apiKey(...).baseURL(...).build();
```

