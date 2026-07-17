# @rateguard/node

Production-grade Node.js SDK for RateGuard.

## Install

```bash
npm install @rateguard/node
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .failMode("failClosed")
  .build();

app.use(guard.middleware());
```

## Supported Channels

- `latest`
- `beta`
- `next`
- `nightly`

## Public API

- `RateGuard`
- `RateGuardClient`
- `RateGuardBuilder`
- `doctor()`
- `createLogger()`
- `PluginRegistry`
- `ObservabilityRegistry`
- Typed error helpers

## Testing

```bash
npm test
```
