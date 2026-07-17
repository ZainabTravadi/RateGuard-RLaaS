# @rateguard/deno

Deno helpers for RateGuard.

## Install

```bash
npm install @rateguard/deno @rateguard/node
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";
import { createDenoMiddleware } from "@rateguard/deno";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

export default createDenoMiddleware(guard);
```
