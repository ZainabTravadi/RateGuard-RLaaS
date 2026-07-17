# @rateguard/bun

Bun helpers for RateGuard.

## Install

```bash
npm install @rateguard/bun @rateguard/node bun-types
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";
import { createBunMiddleware } from "@rateguard/bun";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

export default createBunMiddleware(guard);
```
