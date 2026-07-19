#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { doctor } from "./doctor.js";
import { compilePolicy, createPolicyTemplate, getPolicyTemplate, listPolicyTemplates, simulatePolicy } from "./policy.js";
import { createLogger } from "./logger.js";
import type { RateGuardContext, RateGuardPolicyDefinition } from "./types.js";

interface CLIContext {
  cwd: string;
  configPath: string;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      rest.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }

  return { args, rest };
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function cliConfigPath(cwd = process.cwd()) {
  return resolve(cwd, ".rateguard.json");
}

async function loadConfig(ctx: CLIContext) {
  if (!existsSync(ctx.configPath)) {
    return null;
  }
  return readJson<Record<string, unknown>>(ctx.configPath);
}

function resolveBaseURL(args: Record<string, string | boolean>, config?: Record<string, unknown> | null) {
  return String((args["base-url"] || config?.baseURL || config?.baseUrl || process.env.RATEGUARD_BASE_URL || "https://rateguard-7b9988e4d5f5.herokuapp.com") as string);
}

function resolveApiKey(args: Record<string, string | boolean>, config?: Record<string, unknown> | null) {
  return String((args["api-key"] || config?.apiKey || process.env.RATEGUARD_API_KEY || "") as string);
}

async function resolvePolicyDefinition(args: Record<string, string | boolean>, config?: Record<string, unknown> | null): Promise<RateGuardPolicyDefinition | null> {
  if (args.template && typeof args.template === "string") {
    const template = getPolicyTemplate(args.template);
    return template?.policy ?? null;
  }

  const policyPath = typeof args.policy === "string" ? args.policy : (config?.policyPath as string | undefined);
  if (policyPath && existsSync(policyPath)) {
    return readJson<RateGuardPolicyDefinition>(policyPath);
  }

  return null;
}

async function ensureConfig(ctx: CLIContext) {
  const config = await loadConfig(ctx);
  if (config) return config;
  const initial = {
    apiKey: "",
    baseURL: "https://rateguard-7b9988e4d5f5.herokuapp.com",
    tenantId: "",
    policyPath: "rateguard.policy.json",
  };
  await writeJson(ctx.configPath, initial);
  return initial;
}

async function cmdInit(ctx: CLIContext) {
  if (existsSync(ctx.configPath)) {
    console.log(`Config already exists at ${ctx.configPath}`);
    return;
  }

  await writeJson(ctx.configPath, {
    apiKey: "",
    baseURL: "https://rateguard-7b9988e4d5f5.herokuapp.com",
    tenantId: "",
    policyPath: "rateguard.policy.json",
    createdAt: new Date().toISOString(),
  });

  const template = getPolicyTemplate("api-protection")?.policy ?? createPolicyTemplate("api-protection", {
    name: "api-protection",
    limit: 1000,
    window: "1m",
  }, "Balanced protection for general API traffic").policy;
  await writeJson(resolve(ctx.cwd, "rateguard.policy.json"), template);
  console.log(`Initialized RateGuard config at ${ctx.configPath}`);
}

async function cmdLogin(ctx: CLIContext, args: Record<string, string | boolean>) {
  const config = await ensureConfig(ctx);
  const apiKey = resolveApiKey(args, config);
  const baseURL = resolveBaseURL(args, config);
  const tenantId = String((args.tenant || config?.tenantId || process.env.RATEGUARD_TENANT_ID || "") as string);

  if (!apiKey) {
    throw new Error("Provide --api-key or set RATEGUARD_API_KEY.");
  }

  const next = {
    ...config,
    apiKey,
    baseURL,
    tenantId,
    lastLoginAt: new Date().toISOString(),
  };
  await writeJson(ctx.configPath, next);
  console.log(`Saved RateGuard credentials to ${ctx.configPath}`);
}

async function cmdDoctor(args: Record<string, string | boolean>) {
  const report = await doctor({
    apiKey: typeof args["api-key"] === "string" ? args["api-key"] : process.env.RATEGUARD_API_KEY,
    baseURL: typeof args["base-url"] === "string" ? args["base-url"] : process.env.RATEGUARD_BASE_URL,
    format: args.format === "json" ? "json" : "text",
    timeout: typeof args.timeout === "string" ? Number(args.timeout) : undefined,
    retries: typeof args.retries === "string" ? Number(args.retries) : undefined,
  });

  if (args.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

async function cmdBenchmark(args: Record<string, string | boolean>) {
  const config = await ensureConfig({ cwd: process.cwd(), configPath: cliConfigPath() });
  const apiKey = resolveApiKey(args, config);
  const baseURL = resolveBaseURL(args, config);
  const samples: number[] = [];
  const rounds = typeof args.rounds === "string" ? Math.max(1, Number(args.rounds)) : 5;

  if (!apiKey) {
    throw new Error("Benchmark requires an API key. Use --api-key or RATEGUARD_API_KEY.");
  }

  for (let i = 0; i < rounds; i += 1) {
    const started = Date.now();
    const response = await fetch(`${baseURL}/v1/health`, {
      headers: {
        "x-api-key": apiKey,
        "x-request-id": `benchmark_${Date.now()}_${i}`,
      },
    });
    await response.text();
    samples.push(Date.now() - started);
  }

  const avg = Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  const p95 = samples.slice().sort((a, b) => a - b)[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
  console.log(JSON.stringify({ rounds, averageMs: avg, p95Ms: p95, samples }, null, 2));
}

async function cmdMigrate() {
  const result = spawnSync("npm", ["run", "migrate", "--workspace", "backend"], {
    stdio: "inherit",
    shell: true,
  });
  if ((result.status ?? 1) !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

async function cmdPolicy(args: Record<string, string | boolean>, ctx: CLIContext) {
  const config = await ensureConfig(ctx);
  const policy = await resolvePolicyDefinition(args, config);

  if (!policy) {
    console.log(JSON.stringify({ templates: listPolicyTemplates().map((template) => ({ name: template.name, description: template.description })) }, null, 2));
    return;
  }

  const compiled = compilePolicy(policy);
  const validation = compiled.warnings;
  if (args.action === "validate" || !args.action) {
    console.log(JSON.stringify({ policy: compiled.name, version: compiled.version, hash: compiled.hash, warnings: validation, ruleCount: compiled.rules.length }, null, 2));
    return;
  }

  if (args.action === "templates") {
    console.log(JSON.stringify(listPolicyTemplates(), null, 2));
    return;
  }

  if (args.action === "show") {
    console.log(JSON.stringify(compiled, null, 2));
  }
}

async function cmdAnalytics(args: Record<string, string | boolean>, ctx: CLIContext) {
  const config = await ensureConfig(ctx);
  const apiKey = resolveApiKey(args, config);
  const baseURL = resolveBaseURL(args, config);
  const range = typeof args.range === "string" ? args.range : "30d";

  if (!apiKey) {
    throw new Error("Analytics requires an API key. Use --api-key or RATEGUARD_API_KEY.");
  }

  const response = await fetch(`${baseURL}/analytics/overview?range=${encodeURIComponent(range)}`, {
    headers: {
      "x-api-key": apiKey,
      "x-request-id": `analytics_${Date.now()}`,
    },
  });
  const body = await response.json().catch(() => ({}));
  console.log(JSON.stringify({ ok: response.ok, range, data: body }, null, 2));
  if (!response.ok) process.exitCode = 1;
}

async function cmdExport(args: Record<string, string | boolean>, ctx: CLIContext) {
  const config = await ensureConfig(ctx);
  const output = typeof args.output === "string" ? args.output : resolve(ctx.cwd, "rateguard.export.json");
  const payload = {
    config,
    templates: listPolicyTemplates(),
    exportedAt: new Date().toISOString(),
  };
  await writeJson(output, payload);
  console.log(`Exported RateGuard state to ${output}`);
}

async function cmdImport(args: Record<string, string | boolean>, ctx: CLIContext) {
  const input = typeof args.input === "string" ? args.input : typeof args.file === "string" ? args.file : null;
  if (!input) {
    throw new Error("Import requires --input or --file.");
  }

  const payload = await readJson<{ config?: Record<string, unknown>; policy?: RateGuardPolicyDefinition }>(input);
  if (payload.config) {
    await writeJson(ctx.configPath, payload.config);
  }
  if (payload.policy) {
    await writeJson(resolve(ctx.cwd, "rateguard.policy.json"), payload.policy);
  }
  console.log(`Imported RateGuard state from ${input}`);
}

async function cmdSimulate(args: Record<string, string | boolean>, ctx: CLIContext) {
  const config = await ensureConfig(ctx);
  const policy = await resolvePolicyDefinition(args, config);
  if (!policy) {
    throw new Error("Simulation requires a policy file or template. Use --policy <file> or --template <name>.");
  }

  const contextPath = typeof args.context === "string" ? args.context : null;
  const context = contextPath ? await readJson<RateGuardContext>(contextPath) : {
    identifier: typeof args.identifier === "string" ? args.identifier : "demo-user",
    endpoint: typeof args.endpoint === "string" ? args.endpoint : "/api/demo",
    method: typeof args.method === "string" ? args.method : "GET",
  };

  const result = simulatePolicy({ policy, context });
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [command = "doctor", ...argv] = process.argv.slice(2);
  const { args, rest } = parseArgs(argv);
  const ctx: CLIContext = { cwd: process.cwd(), configPath: cliConfigPath() };

  switch (command) {
    case "doctor":
      await cmdDoctor(args);
      break;
    case "init":
      await cmdInit(ctx);
      break;
    case "login":
      await cmdLogin(ctx, args);
      break;
    case "benchmark":
      await cmdBenchmark(args);
      break;
    case "migrate":
      await cmdMigrate();
      break;
    case "policy":
      args.action = typeof rest[0] === "string" ? rest[0] : (args.action || "validate");
      await cmdPolicy(args, ctx);
      break;
    case "analytics":
      await cmdAnalytics(args, ctx);
      break;
    case "export":
      await cmdExport(args, ctx);
      break;
    case "import":
      await cmdImport(args, ctx);
      break;
    case "simulate":
      await cmdSimulate(args, ctx);
      break;
    default:
      console.error(`Unknown command "${command}". Available commands: doctor, init, login, benchmark, migrate, policy, analytics, export, import, simulate`);
      process.exitCode = 1;
  }
}

main().catch((error) => {
  const logger = createLogger({ format: "pretty" });
  logger.error?.(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
