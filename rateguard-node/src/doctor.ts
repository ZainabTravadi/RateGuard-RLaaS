import { createRequire } from "node:module";
import dns from "node:dns/promises";
import tls from "node:tls";
import { resolveClientConfig } from "./config.js";
import { SDK_VERSION } from "./version.js";
import { createLogger } from "./logger.js";
import type { RateGuardPlugin } from "./types.js";

const require = createRequire(import.meta.url);

export interface DoctorOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  failMode?: "failClosed" | "failOpen" | "warnOnly" | "shadowMode";
  format?: "text" | "json";
  logger?: ReturnType<typeof createLogger>;
  plugins?: RateGuardPlugin[];
}

export interface DoctorCheck {
  name: string;
  status: "PASS" | "WARNING" | "FAIL";
  detail?: string;
  suggestion?: string;
  value?: unknown;
  durationMs?: number;
}

export interface DoctorReport {
  ok: boolean;
  warnings: number;
  timestamp: string;
  sdkVersion: string;
  nodeVersion: string;
  checks: DoctorCheck[];
  backend?: Record<string, unknown>;
}

function makeCheck(
  name: string,
  status: DoctorCheck["status"],
  detail?: string,
  suggestion?: string,
  value?: unknown,
  durationMs?: number
): DoctorCheck {
  return { name, status, detail, suggestion, value, durationMs };
}

function verdict(status: DoctorCheck["status"]) {
  return status;
}

async function withTiming<T>(fn: () => Promise<T>) {
  const started = Date.now();
  const value = await fn();
  return { value, durationMs: Date.now() - started };
}

function detectFramework() {
  const hints: Array<[string, string]> = [
    ["next", "Next.js"],
    ["fastify", "Fastify"],
    ["express", "Express"],
    ["koa", "Koa"],
    ["hono", "Hono"],
    ["@nestjs/common", "NestJS"],
  ];

  for (const [pkg, name] of hints) {
    try {
      require.resolve(pkg);
      return name;
    } catch {
      continue;
    }
  }

  return "Unknown";
}

async function validateDns(baseURL: string) {
  const url = new URL(baseURL);
  return dns.lookup(url.hostname);
}

async function validateTls(baseURL: string) {
  const url = new URL(baseURL);
  if (url.protocol !== "https:") {
    return { skipped: true };
  }

  return await new Promise<{ authorized: boolean; authorizationError?: string }>((resolve) => {
    const socket = tls.connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: 3000,
    });

    socket.on("secureConnect", () => {
      resolve({ authorized: socket.authorized, authorizationError: socket.authorizationError?.message });
      socket.destroy();
    });
    socket.on("error", (error) => {
      resolve({ authorized: false, authorizationError: error.message });
      socket.destroy();
    });
    socket.on("timeout", () => {
      resolve({ authorized: false, authorizationError: "TLS validation timed out" });
      socket.destroy();
    });
  });
}

async function benchmarkBackend(baseURL: string, apiKey: string, retries: number, timeout: number) {
  const samples: number[] = [];
  for (let i = 0; i < Math.max(1, Math.min(3, retries + 1)); i += 1) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${baseURL}/v1/health`, {
        headers: {
          "x-api-key": apiKey,
          "x-request-id": `doctor_${Date.now()}_${i}`,
        },
        signal: controller.signal,
      });
      samples.push(Date.now() - started);
      if (!response.ok) {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return samples;
}

function validateDependencies() {
  const packages = [
    "express",
    "fastify",
    "koa",
    "hono",
    "next",
    "@nestjs/common",
    "typescript",
  ];

  const resolved: Record<string, boolean> = {};
  for (const pkg of packages) {
    try {
      require.resolve(pkg);
      resolved[pkg] = true;
    } catch {
      resolved[pkg] = false;
    }
  }
  return resolved;
}

function validatePlugins(plugins: RateGuardPlugin[] | undefined) {
  if (!plugins?.length) {
    return makeCheck("plugin validation", "WARNING", "No plugins registered for doctor validation.", "Register plugins or pass the plugin list to doctor().");
  }

  const names = new Set<string>();
  for (const plugin of plugins) {
    if (!plugin.name) {
      return makeCheck("plugin validation", "FAIL", "A plugin is missing a name.", "Give every plugin a unique name.");
    }
    if (names.has(plugin.name)) {
      return makeCheck("plugin validation", "FAIL", `Duplicate plugin detected: ${plugin.name}.`, "Remove duplicates or rename one of the plugins.");
    }
    names.add(plugin.name);
  }

  return makeCheck("plugin validation", "PASS", `${plugins.length} plugin(s) validated.`, undefined, plugins.map((plugin) => plugin.name));
}

export async function doctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const logger = options.logger || createLogger({ format: "pretty" });
  const checks: DoctorCheck[] = [];
  let config;

  try {
    config = resolveClientConfig({
      apiKey: options.apiKey || process.env.RATEGUARD_API_KEY || "",
      baseURL: options.baseURL || process.env.RATEGUARD_BASE_URL || process.env.RATEGUARD_URL || "",
      timeout: options.timeout,
      retries: options.retries,
      failMode: options.failMode,
      logger,
    });
    checks.push(makeCheck("configuration", "PASS", "Configuration is valid.", undefined, { baseURL: config.baseURL, failMode: config.failMode }));
  } catch (error) {
    checks.push(makeCheck("configuration", "FAIL", error instanceof Error ? error.message : String(error), "Set RATEGUARD_API_KEY and RATEGUARD_BASE_URL before running doctor."));
  }

  const nodeMajor = Number(process.versions.node.split(".")[0] || 0);
  checks.push(makeCheck("node version", nodeMajor >= 18 ? "PASS" : "FAIL", `Node.js ${process.versions.node}`, "Upgrade to Node.js 18 or newer.", process.versions.node));

  checks.push(makeCheck("sdk version", "PASS", `RateGuard SDK ${SDK_VERSION}`, undefined, SDK_VERSION));
  checks.push(makeCheck("framework detection", "PASS", `Detected ${detectFramework()}.`, undefined, detectFramework()));
  checks.push(makeCheck("dependency validation", "PASS", "Dependency resolution completed.", undefined, validateDependencies()));
  checks.push(validatePlugins(options.plugins));

  if (config) {
    try {
      const dnsResult = await withTiming(() => validateDns(config.baseURL));
      checks.push(makeCheck("dns validation", "PASS", `Resolved ${dnsResult.value.address} (${dnsResult.value.family}).`, undefined, dnsResult.value, dnsResult.durationMs));
    } catch (error) {
      checks.push(makeCheck("dns validation", "FAIL", error instanceof Error ? error.message : String(error), "Check DNS and the backend hostname."));
    }

    try {
      const tlsResult = await withTiming(() => validateTls(config.baseURL));
      if ("skipped" in tlsResult.value) {
        checks.push(makeCheck("tls validation", "WARNING", "TLS validation skipped for non-HTTPS backend.", "Use HTTPS in production."));
      } else if (tlsResult.value.authorized) {
        checks.push(makeCheck("tls validation", "PASS", "TLS handshake succeeded.", undefined, tlsResult.value, tlsResult.durationMs));
      } else {
        checks.push(makeCheck("tls validation", "FAIL", tlsResult.value.authorizationError || "TLS validation failed.", "Check certificate chain and hostname."));
      }
    } catch (error) {
      checks.push(makeCheck("tls validation", "FAIL", error instanceof Error ? error.message : String(error), "Check certificate chain and hostname."));
    }

    try {
      const started = Date.now();
      const response = await fetch(`${config.baseURL}/v1/health`, {
        headers: {
          "x-api-key": config.apiKey,
          "x-request-id": `doctor_${Date.now()}`,
        },
      });
      const body = await response.json().catch(() => ({} as Record<string, unknown>));
      const latencyMs = Date.now() - started;
      const benchmark = await benchmarkBackend(config.baseURL, config.apiKey, config.retries, config.timeout);
      const benchmarkAvg = benchmark.length ? Math.round(benchmark.reduce((sum, value) => sum + value, 0) / benchmark.length) : latencyMs;

      const backend = {
        status: response.status,
        backendVersion: body.backendVersion,
        redis: body.redis,
        redisConnected: body.redisConnected,
        redisMock: body.redisMock,
        migrations: body.migrations,
        latencyMs,
        benchmarkAvgMs: benchmarkAvg,
      };

      checks.push(makeCheck("backend version", response.ok ? "PASS" : "FAIL", response.ok ? `Backend ${body.backendVersion || "unknown"}` : `Backend responded with ${response.status}`, response.ok ? undefined : "Verify the backend URL and API key.", body.backendVersion, latencyMs));
      checks.push(makeCheck("redis status", body.redisConnected ? "PASS" : "FAIL", typeof body.redis === "string" ? body.redis : "Redis state unavailable.", body.redisConnected ? undefined : "Check Redis credentials, network access, and the backend REDIS_URL.", body.redis));
      checks.push(makeCheck("migration status", Number(body?.migrations?.pending || 0) === 0 ? "PASS" : "FAIL", body?.migrations ? `${body.migrations.applied} applied, ${body.migrations.pending} pending` : "Migration details unavailable.", "Run backend migrations if any are pending.", body?.migrations));
      checks.push(makeCheck("latency benchmark", benchmarkAvg <= config.timeout ? "PASS" : "WARNING", `Average ${benchmarkAvg}ms over ${benchmark.length || 1} probe(s).`, benchmarkAvg > config.timeout ? "Increase timeout or reduce backend latency." : undefined, benchmark, latencyMs));
      checks.push(makeCheck("network diagnostics", response.ok ? "PASS" : "FAIL", response.ok ? "Backend reachable." : "Backend health endpoint returned an error.", response.ok ? undefined : "Check the backend URL, API key, and network path.", backend, latencyMs));
      checks.push(makeCheck("retry diagnostics", config.retries > 0 ? "PASS" : "WARNING", `Retries configured at ${config.retries}.`, config.retries === 0 ? "Consider enabling retries for transient network errors." : undefined, config.retries));
      checks.push(makeCheck("timeout diagnostics", config.timeout > 0 ? "PASS" : "FAIL", `Timeout configured at ${config.timeout}ms.`, "Use a positive timeout value.", config.timeout));
      checks.push(makeCheck("backend summary", "PASS", "Backend diagnostics collected.", undefined, backend));
    } catch (error) {
      checks.push(makeCheck("backend version", "FAIL", error instanceof Error ? error.message : String(error), "Verify the backend URL and API key."));
      checks.push(makeCheck("network diagnostics", "FAIL", error instanceof Error ? error.message : String(error), "Confirm the backend is reachable from this machine."));
      checks.push(makeCheck("retry diagnostics", config.retries > 0 ? "PASS" : "WARNING", `Retries configured at ${config.retries}.`, config.retries === 0 ? "Consider enabling retries for transient network errors." : undefined, config.retries));
      checks.push(makeCheck("timeout diagnostics", config.timeout > 0 ? "PASS" : "FAIL", `Timeout configured at ${config.timeout}ms.`, "Use a positive timeout value.", config.timeout));
    }
  }

  const ok = checks.every((check) => check.status !== "FAIL");
  const warnings = checks.filter((check) => check.status === "WARNING").length;
  const backend = checks.find((check) => check.name === "backend summary")?.value as Record<string, unknown> | undefined;

  const report: DoctorReport = {
    ok,
    warnings,
    timestamp: new Date().toISOString(),
    sdkVersion: SDK_VERSION,
    nodeVersion: process.versions.node,
    checks,
    backend,
  };

  if (options.format !== "json") {
    for (const check of checks) {
      const line = `${verdict(check.status)} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`;
      if (check.status === "FAIL") logger.error?.(line);
      else if (check.status === "WARNING") logger.warn?.(line);
      else logger.info?.(line);
      if (check.suggestion && check.status !== "PASS") {
        logger.warn?.(`  Suggested fix: ${check.suggestion}`);
      }
    }
  }

  return report;
}
