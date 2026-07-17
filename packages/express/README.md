# @rateguard/express

Express middleware helpers for RateGuard.

## Install

```bash
npm install @rateguard/express @rateguard/node express
```

## Usage

```ts
import express from "express";
import { RateGuard } from "@rateguard/node";
import { createExpressMiddleware } from "@rateguard/express";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

const app = express();
app.use(createExpressMiddleware(guard));
```
