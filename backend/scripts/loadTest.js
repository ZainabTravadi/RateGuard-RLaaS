import { evaluate } from '../src/modules/enforcement/rateLimit.service.js';
import { randomUUID } from 'crypto';

// Simple load tester for RateLimitService (in-process)
// Usage: node scripts/loadTest.js [requests] [concurrency]

const totalRequests = Number(process.argv[2]) || 200;
const concurrency = Number(process.argv[3]) || 50;

// simple rule for testing
const rule = {
  id: 'load_test_rule',
  limit_count: 100,
  window_seconds: 60,
  scope: 'endpoint',
  endpoint: '/v1/check',
  method: 'POST',
  strategy: 'sliding-window',
};

async function runBatch(requests) {
  const results = [];
  for (let i = 0; i < requests; i++) {
    results.push((async () => {
      const start = Date.now();
      const now = Math.floor(Date.now() / 1000);
      const identifier = `loadtest-${Math.floor(i % 10)}`; // reuse identifiers to create contention
      const res = await evaluate({
        rules: [rule],
        identifier,
        endpoint: '/v1/check',
        method: 'POST',
        apiKeyId: 'loadtest-key',
        environmentId: 'env-loadtest',
        now,
      });
      const duration = Date.now() - start;
      return { allowed: res.allowed, duration };
    })());
  }
  return Promise.all(results);
}

(async () => {
  const batches = Math.ceil(totalRequests / concurrency);
  const allResults = [];

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, totalRequests - b * concurrency);
    /* eslint-disable no-await-in-loop */
    const batchRes = await runBatch(batchSize);
    allResults.push(...batchRes);
  }

  const requests = allResults.length;
  const blocked = allResults.filter((r) => !r.allowed).length;
  const avgLatency = Math.round(allResults.reduce((s, r) => s + r.duration, 0) / requests);
  const latencies = allResults.map((r) => r.duration).sort((a, b) => a - b);
  const p95 = latencies[Math.floor(requests * 0.95)] || latencies[latencies.length - 1];

  const summary = {
    requests,
    blocked,
    avgLatencyMs: `${avgLatency}ms`,
    p95LatencyMs: `${p95}ms`,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
})();
