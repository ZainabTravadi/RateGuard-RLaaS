# @rateguard/nest

NestJS helpers for RateGuard.

## Install

```bash
npm install @rateguard/nest @rateguard/node @nestjs/common
```

## Usage

```ts
import { RateGuard } from "@rateguard/node";
import { RateGuardGuard } from "@rateguard/nest";

const guard = RateGuard.builder()
  .apiKey(process.env.RATEGUARD_API_KEY ?? "")
  .baseURL(process.env.RATEGUARD_BASE_URL ?? "http://localhost:4000")
  .build();

export class AppGuard extends RateGuardGuard {
  constructor() {
    super(guard);
  }
}
```
