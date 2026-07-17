# @rateguard/koa

Koa helpers for RateGuard.

## Install

```bash
npm install @rateguard/koa @rateguard/node koa
```

## Usage

```ts
import Koa from "koa";
import { RateGuard } from "@rateguard/node";
import { createKoaMiddleware } from "@rateguard/koa";

const app = new Koa();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

app.use(createKoaMiddleware(guard));
```
