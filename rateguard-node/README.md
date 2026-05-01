# @rateguard/node

Production-grade rate limiting SDK for Node.js applications.

## Installation

```bash
npm install @rateguard/node
```

## Quick Start

### Express.js

```javascript
import express from 'express';
import { RateGuard } from '@rateguard/node';

const app = express();

// Initialize SDK with just your API key
// baseUrl defaults to http://localhost:4000 in local development
RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY
});

// Apply middleware to specific routes
app.post('/api/pdf-to-ppt', 
  RateGuard.middleware(),
  (req, res) => {
    res.json({ message: 'Protected by RateGuard' });
  }
);

app.listen(3000, () => {
  console.log('Server running with RateGuard protection');
});
```

### Programmatic Usage

```javascript
import { limit } from '@rateguard/node';

async function handleRequest() {
  try {
    const result = await limit({
      identifier: 'user-123',
      endpoint: '/api/data',
      method: 'GET'
    });
    
    console.log(result); 
    // { allowed: true, limit: 100, remaining: 99, reset: 1705437600 }
  } catch (err) {
    console.error('Rate limited:', err.retryAfter);
  }
}
```

## Configuration

Required:
- **apiKey** - Your RateGuard API key from the dashboard

Optional:
- **baseUrl** - RateGuard API endpoint (default: `http://localhost:4000`)
  - Can also set via `RATEGUARD_URL` environment variable or `RateGuard.init({ baseUrl })`

```javascript
RateGuard.init({
  apiKey: 'rg_live_abc123...',
  baseUrl: 'http://localhost:4000' // Optional, this is the local default
});
```

## API Reference

### RateGuard.init(config)

Initialize the SDK. Must be called before using middleware or programmatic checks.

```typescript
RateGuard.init({
  apiKey: string;      // Required
  baseUrl?: string;    // Optional, defaults to http://localhost:4000
});
```

### RateGuard.middleware()

Express.js middleware for automatic rate limiting. Apply to your entire app or specific routes.

```typescript
app.use(RateGuard.middleware());
// OR specific routes:
app.get('/api/data', RateGuard.middleware(), handler);
```

Returns HTTP 429 (Too Many Requests) when rate limits are exceeded.

### limit(options)

Programmatic rate limit check. Useful for non-HTTP scenarios or custom logic.

```typescript
const result = await limit({
  identifier: string;   // User ID, IP, or unique key
  endpoint: string;     // API endpoint path
  method: string;       // HTTP method (GET, POST, etc)
});

// Returns:
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
import type { RateLimitResponse, RateGuardConfig } from '@rateguard/node';

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
});

const middleware = RateGuard.middleware();
```

## Node.js Compatibility

- **Node.js 18+** - Fully supported
- **Node.js 16** - May work but not tested

## License

MIT

## Support

- Issues: https://github.com/rateguard/rateguard-node/issues
- Docs: see the repository README and local examples
- Email: support@rateguard.io
