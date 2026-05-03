import express from 'express';
import { RateGuard } from '../dist/index.js';

const apiKey = process.env.RATEGUARD_API_KEY;
const baseUrl = process.env.RATEGUARD_URL || 'http://127.0.0.1:4000';
const port = Number(process.env.PORT || 3001);

if (!apiKey) {
  throw new Error('RATEGUARD_API_KEY is required');
}

RateGuard.init({
  apiKey,
  baseUrl,
  debug: true,
});

const app = express();

app.use(
  RateGuard.middleware({
    smartMode: true,
    limit: 5,
    window: '60s',
    identifier: (req) => String(req.headers['x-demo-id'] || req.ip || 'anonymous'),
    skip: (req) => req.path === '/skip',
  })
);

app.post('/api/pdf-to-txt', (_req, res) => {
  res.json({ ok: true, route: '/api/pdf-to-txt' });
});

app.get('/skip', (_req, res) => {
  res.json({ ok: true, skipped: true });
});

const server = app.listen(port, async () => {
  console.log(`Express sample listening on http://127.0.0.1:${port}`);

  if (process.env.RUN_SMOKE === 'true') {
    const target = `http://127.0.0.1:${port}`;
    const identifier = `sdk-smoke-${Date.now()}`;
    const results = [];

    const fetchJson = async (path, method = 'GET') => {
      const response = await fetch(target + path, {
        method,
        headers: { 'x-demo-id': identifier },
      });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return {
        status: response.status,
        retryAfter: response.headers.get('retry-after'),
        limit: response.headers.get('x-ratelimit-limit'),
        remaining: response.headers.get('x-ratelimit-remaining'),
        warning: response.headers.get('x-rateguard-warning'),
        body,
      };
    };

    results.push(await fetchJson('/skip'));
    for (let index = 0; index < 6; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await fetchJson('/api/pdf-to-txt', 'POST'));
    }

    console.log(JSON.stringify(results, null, 2));
    server.close(() => process.exit(0));
  }
});
