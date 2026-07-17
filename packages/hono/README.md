# @rateguard/hono

Hono helpers for RateGuard.

## Install

```bash
npm install @rateguard/hono @rateguard/node hono
```

## Usage

```ts
import { Hono } from "hono";
import { RateGuard } from "@rateguard/node";
import { createHonoMiddleware } from "@rateguard/hono";

const app = new Hono();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

app.use("*", createHonoMiddleware(guard));
```
