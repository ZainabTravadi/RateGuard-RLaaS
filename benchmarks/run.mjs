#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const sdkDist = resolve(root, "rateguard-node", "dist", "index.js");
const reportDir = resolve(root, "benchmarks", "reports");

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

async function main() {
  const beforeMemory = process.memoryUsage().heapUsed;
  const importStarted = performance.now();
  const sdk = await import(pathToFileURL(sdkDist).href);
  const importDurationMs = performance.now() - importStarted;

  const transport = {
    async send() {
      return {
        status: 200,
        headers: { "x-request-id": "bench_req" },
        body: {
          allowed: true,
          limit: 100,
          remaining: 99,
          requestId: "bench_req",
        },
      };
    },
  };

  const client = new sdk.RateGuardClient({
    apiKey: "rg_bench_123",
    baseURL: "https://api.example.com",
    transport,
    retries: 0,
  });

  const warmups = 25;
  const iterations = 250;
  for (let i = 0; i < warmups; i += 1) {
    // Warm the JIT and code paths.
    await client.check({ identifier: `warmup-${i}`, endpoint: "/bench", method: "GET" });
  }

  const timings = [];
  const startedCpu = process.cpuUsage();
  const started = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    const loopStart = performance.now();
    await client.check({ identifier: `user-${i}`, endpoint: "/bench", method: "GET" });
    timings.push(performance.now() - loopStart);
  }
  const totalDurationMs = performance.now() - started;
  const cpu = process.cpuUsage(startedCpu);
  const afterMemory = process.memoryUsage().heapUsed;

  const distFiles = ["client.js", "doctor.js", "errors.js", "index.js", "logger.js", "observability.js", "plugins.js", "policy.js", "rateguard.js", "version.js"];
  let bundleBytes = 0;
  for (const file of distFiles) {
    try {
      const stat = await readFile(resolve(root, "rateguard-node", "dist", file));
      bundleBytes += stat.byteLength;
    } catch {
      // Ignore missing optional files.
    }
  }

  await mkdir(reportDir, { recursive: true });
  const report = `# RateGuard Benchmark Report

- Generated: ${new Date().toISOString()}
- SDK import time: ${importDurationMs.toFixed(2)} ms
- Iterations: ${iterations}
- Warmups: ${warmups}
- Median check latency: ${percentile(timings, 50).toFixed(2)} ms
- p95 check latency: ${percentile(timings, 95).toFixed(2)} ms
- Total benchmark time: ${totalDurationMs.toFixed(2)} ms
- CPU user time: ${(cpu.user / 1000).toFixed(2)} ms
- CPU system time: ${(cpu.system / 1000).toFixed(2)} ms
- Heap before: ${beforeMemory}
- Heap after: ${afterMemory}
- Heap delta: ${afterMemory - beforeMemory}
- SDK dist bytes: ${bundleBytes}
- Redis calls: 0 (mock transport)
- Database calls: 0 (mock transport)

Notes:
- This report measures the SDK with a mocked transport so the timing stays reproducible.
- Backend, Redis, and database latency should be measured separately in the backend integration suite.
`;
  await writeFile(resolve(reportDir, "latest.md"), report, "utf8");
  console.log(report);
  await client.dispose();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
