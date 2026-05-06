# @rateguard/node

**Production-grade rate limiting SDK for Node.js applications** — Protect your APIs with rules you define in the RateGuard dashboard.

RateGuard helps you centralize rate limiting policy in a dashboard instead of hardcoding limits in application code. The SDK fetches rules dynamically and enforces them automatically. Change limits without redeploying.

---

## Table of Contents

1. [Installation](#1-install-the-sdk)
2. [Configure Environment Variables](#2-configure-environment-variables)
3. [Create an API Key](#3-create-an-api-key)
4. [Add Express Integration](#4-add-the-express-integration)
5. [How Rules Work](#5-how-rules-work)
6. [How Enforcement Works](#6-how-enforcement-works-automatically)
7. [Test Rate Limiting](#7-test-rate-limiting)
8. [Expected Response Headers](#8-expected-response-headers)
9. [Dashboard Metrics](#9-what-the-dashboard-should-show)
10. [Troubleshooting](#10-troubleshooting)
11. [Production Checklist](#production-checklist)

---

## 1) Install the SDK

```bash
npm install @rateguard/node
```

---

## 2) Configure environment variables

Create a `.env` file in your project root:

```env
RATEGUARD_API_KEY=your_api_key_here
RATEGUARD_BASE_URL=http://localhost:4000
```

### What each variable means

- `RATEGUARD_API_KEY`: created in the RateGuard dashboard. It identifies your project and environment, and the SDK uses it to authenticate with the RateGuard backend.
- `RATEGUARD_BASE_URL`: the RateGuard backend URL the SDK talks to. Use your local backend while developing and your production backend URL in production.

Example production value:

```env
RATEGUARD_BASE_URL=https://rateguard-7b9988e4d5f5.herokuapp.com
```

---

## 3) Create an API key

In the RateGuard dashboard:

1. Open your project.
2. Go to the API keys or settings page.
3. Create a new API key for the environment you want to protect.
4. Copy the key into `RATEGUARD_API_KEY`.
5. Keep the key private and do not commit it to source control.

---

## 4) Add the Express integration

Use this as your app entrypoint. It is copy-paste ready for an Express app that uses ESM syntax.

```js
import express from "express";
import dotenv from "dotenv";
import { RateGuard } from "@rateguard/node";

dotenv.config();

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_BASE_URL
});

const app = express();

app.use(express.json());

app.use(
  RateGuard.middleware({
    identifier: (req) =>
      req.headers["x-user-id"] || req.ip
  })
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Protected route"
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(
    `Test app running on http://localhost:${PORT}`
  );
});
```

### Why this order matters

- `dotenv.config()` loads your local environment before the SDK initializes.
- `RateGuard.init(...)` runs once at startup and configures the SDK.
- `RateGuard.middleware(...)` protects every request that passes through Express.
- The `identifier` function defines the subject being limited. In this example, the SDK uses `x-user-id` when present and falls back to the request IP.

---

## 5) How rules work

Rules are configured in the RateGuard dashboard, not in your app code.

That means:

- developers do not hardcode limits in Express
- the SDK fetches active rules from the RateGuard backend
- dashboard changes take effect dynamically without redeploying the app
- the same middleware can enforce different limits per endpoint, identity, or scope depending on the dashboard rule

Example rule:

```txt
10 requests / minute
Endpoint: /test
Scope: IP
```

With that rule in place, the SDK automatically blocks requests that exceed the configured threshold.

---

## 6) How enforcement works automatically

At runtime, the middleware evaluates each request against the active rule set for your project. The request flow is:

1. A request reaches your Express app.
2. The middleware identifies the request using your `identifier` function.
3. The SDK asks the RateGuard backend for the applicable rule state.
4. If the request is allowed, Express continues normally.
5. If the request exceeds the configured limit, the SDK returns a `429 Too Many Requests` response.

The important part is that the limit itself comes from the dashboard. Your application code stays fixed while the policy changes live in RateGuard.

---

## 7) Test rate limiting

After you start the app, send repeated requests to the protected route:

```bash
for i in {1..20}; do
  curl http://localhost:3000/test
done
```

If the dashboard rule is set to `10 requests / minute` for `/test` by IP, the expected behavior is:

- the first 10 requests return `200`
- the remaining requests return `429`

Tip: if you want to test user-scoped enforcement, send an `x-user-id` header and keep the same value across requests.

---

## 8) Expected response headers

When the middleware applies a limit, you should expect these headers:

```txt
X-RateLimit-Limit
X-RateLimit-Remaining
Retry-After
```

Example blocked response:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 42
}
```

If your app uses a custom error formatter, keep the same status code and semantic meaning: `429` for blocked requests and a `Retry-After` value that tells the client when it can try again.

---

## 9) What the dashboard should show

Once traffic is flowing, the dashboard should surface operational data such as:

- total requests
- blocked requests
- request logs
- traffic analytics
- block rate percentage

Use these views to confirm that rules are firing, traffic patterns are visible, and blocked requests are being recorded as expected.

---

## 10) Troubleshooting

### Invalid API key

**Symptom:** the app starts, but requests are not authenticated against RateGuard or the SDK reports an authorization error.

**Fix:**

- verify `RATEGUARD_API_KEY` is set in the environment
- confirm the key was copied from the correct dashboard project/environment
- restart the app after changing `.env`

### Backend unreachable

**Symptom:** the SDK cannot contact the RateGuard backend.

**Fix:**

- check `RATEGUARD_BASE_URL`
- confirm the backend is running and reachable from your app
- verify local development URLs differ from production URLs

### Rules not applying

**Symptom:** requests keep passing even though a dashboard rule exists.

**Fix:**

- make sure the rule is enabled in the dashboard
- verify the rule targets the correct endpoint, method, or scope
- confirm the route you are testing is actually protected by the middleware
- check that the identifier matches the scope you intended

### Blocked requests not visible

**Symptom:** clients receive `429`, but you do not see blocked events in the dashboard.

**Fix:**

- verify the app is using the correct project API key
- confirm the backend URL points to the same environment as the dashboard
- wait a moment and refresh dashboard analytics or logs

### Endpoint mismatch

**Symptom:** the rule is configured for `/test`, but another route is being hit.

**Fix:**

- confirm the request path in Express matches the dashboard rule exactly
- check whether your app uses a prefix such as `/api/test`
- update the dashboard rule or the route path so they match

### Wrong base URL

**Symptom:** local development works inconsistently or production requests are pointed at the wrong backend.

**Fix:**

- use `http://localhost:4000` for a local backend during development
- use the production backend URL in production
- verify `RATEGUARD_BASE_URL` is not still pointing at a dev server

---

## Production checklist

- Set `RATEGUARD_API_KEY` and `RATEGUARD_BASE_URL` in the runtime environment.
- Keep rate limits in the RateGuard dashboard, not in app code.
- Initialize the SDK once at process startup.
- Apply `RateGuard.middleware(...)` before protected routes.
- Test the `/test` route with repeated requests and verify `429` responses.
- Review dashboard logs and analytics after rollout.

---

## Summary

The production model is simple:

- your app initializes the SDK once
- the dashboard defines the rules
- the middleware enforces those rules automatically
- dashboard changes take effect without redeploying the app

That keeps rate limiting centralized, consistent, and easy to operate.

---

## API Reference

### RateGuard.init(config)

Initialize the SDK. Call this **once** at app startup.

```typescript
RateGuard.init({
  apiKey: string;           // Required: Your API key from dashboard
  baseUrl: string;          // Required: RateGuard backend URL
  timeoutMs?: number;       // Optional: Request timeout (default: 5000ms)
  debug?: boolean;          // Optional: Enable debug logging
});
```

### RateGuard.middleware(options?)

Express middleware for automatic rate limiting on protected routes.

```typescript
app.use(
  RateGuard.middleware({
    identifier?: (req) => string;  // Function to extract identifier (default: IP)
    skip?: (req) => boolean;       // Skip rate limiting for certain requests
    failOpen?: boolean;            // Allow requests if backend unreachable (default: true)
  })
);
```

### RateGuard.limit(options)

Programmatic rate limit check for non-middleware scenarios.

```typescript
const result = await RateGuard.limit({
  identifier: string;   // User ID, IP, or unique key
  endpoint: string;     // API endpoint path
  method?: string;      // HTTP method (GET, POST, etc)
});

// Returns:
interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}
```

---

## TypeScript Support

Full TypeScript support included. Types are automatically available:

```typescript
import { RateGuard } from '@rateguard/node';
import type { RateLimitResult, RateGuardConfig } from '@rateguard/node';

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_BASE_URL
});
```

---

## Node.js Compatibility

- **Node.js 18+** — Fully supported
- **Node.js 16** — May work but not officially tested

---

## License

MIT

---

## Support & Resources

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See the [main RateGuard README](https://github.com/rateguard/rateguard) for architecture and deployment
- **Dashboard**: Manage rules and view analytics at your RateGuard instance

---

## Summary

The production model is simple:

- your app initializes the SDK once
- the dashboard defines the rules
- the middleware enforces those rules automatically
- dashboard changes take effect without redeploying the app

That keeps rate limiting centralized, consistent, and easy to operate.
interface RateLimitResponse {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
  ruleId?: string;
}
```

## Error Handling

### Middleware Response

When rate limit is exceeded:

```json
HTTP/1.1 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### Programmatic Usage

```javascript
try {
  const result = await limit({ identifier, endpoint, method });
  if (!result.allowed) {
    // Handle rate limit
    console.log(`Retry after ${result.retryAfter} seconds`);
  }
} catch (err) {
  // Handle other errors
}
```

## Behavior on Service Failure

If the RateGuard API is unreachable:
- The SDK will **fail open** (allow traffic) 
- An error will be logged for debugging
- Your application continues to work normally
- We recommend monitoring these logs to know when RateGuard connectivity issues occur

Example:
```
[RateGuard] Request timeout after 5s
[RateGuard] Network error: ECONNREFUSED
```

## TypeScript Support

Full TypeScript support included. Types are automatically available:

```typescript
import { RateGuard } from '@rateguard/node';
import type { RateLimitResult, RateGuardConfig } from '@rateguard/node';

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_BASE_URL
});

const middleware = RateGuard.middleware();
```

---

## Node.js Compatibility

- **Node.js 18+** — Fully supported
- **Node.js 16** — May work but not officially tested

---

## License

MIT

---

## Support & Resources

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See the [main RateGuard README](https://github.com/rateguard/rateguard) for architecture and deployment
- **Dashboard**: Manage rules and view analytics at your RateGuard instance

---

## Summary

The production model is simple:

- your app initializes the SDK once
- the dashboard defines the rules
- the middleware enforces those rules automatically
- dashboard changes take effect without redeploying the app

That keeps rate limiting centralized, consistent, and easy to operate.
