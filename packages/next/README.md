# @rateguard/next

Next.js middleware helpers for RateGuard.

## Install

```bash
npm install @rateguard/next @rateguard/node next
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";
import { createNextMiddleware } from "@rateguard/next";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

export default createNextMiddleware(guard);
```
