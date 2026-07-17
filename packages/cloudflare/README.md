# @rateguard/cloudflare

Cloudflare Workers helpers for RateGuard.

## Install

```bash
npm install @rateguard/cloudflare @rateguard/node
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";
import { createCloudflareHandler } from "@rateguard/cloudflare";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

export default {
  fetch: createCloudflareHandler(guard),
};
```
