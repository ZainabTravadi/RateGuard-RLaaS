# @rateguard/fastify

Fastify helpers for RateGuard.

## Install

```bash
npm install @rateguard/fastify @rateguard/node fastify
```

## Usage

```ts
import Fastify from "fastify";
import { RateGuard } from "@rateguard/node";
import { registerFastifyRateGuard } from "@rateguard/fastify";

const app = Fastify();
const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

registerFastifyRateGuard(app, guard);
```
