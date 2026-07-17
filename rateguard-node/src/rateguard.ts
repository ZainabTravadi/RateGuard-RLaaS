import type { Request, RequestHandler } from "express";
import { RateGuardClient } from "./client.js";
import { createLogger } from "./logger.js";
import { createPluginRegistry, PluginRegistry } from "./plugins.js";
import { PolicyBuilder, resolvePolicyContext, createPolicyCompiler } from "./policy.js";
import {
  ConfigurationError,
  RateLimitExceededError,
  serializeError,
} from "./errors.js";
import type {
  RateGuardAnalyticsSummary,
  RateGuardBuilderOptions,
  RateGuardContext,
  RateGuardHealthStatus,
  RateGuardLifecycleContext,
  RateGuardPlugin,
  RateGuardPolicyDefinition,
  RateGuardPolicyResult,
  RateGuardPolicySimulationResult,
  RateGuardProgrammaticLimitOptions,
  RateGuardTransport,
  RateLimitResult,
} from "./types.js";
import { SDK_VERSION } from "./version.js";

function now() {
  return new Date().toISOString();
}

function isRequestLike(value: unknown): value is Request {
  return typeof value === "object" && value !== null && "method" in value && "headers" in value;
}

function normalizeInput(input?: RateGuardProgrammaticLimitOptions | RateGuardContext | Request | string): RateGuardContext {
  if (!input) return {};
  if (typeof input === "string") {
    return { identifier: input };
  }
  if (isRequestLike(input)) {
    const headers = input.headers as Record<string, string | undefined>;
    return {
      request: input,
      identifier: headers["x-user-id"] || input.ip || "anonymous",
      ip: input.ip,
      path: input.path || String((input as Request).url || "").split("?")[0],
      endpoint: input.path || String((input as Request).url || "").split("?")[0],
      method: input.method,
      routeName: (input as Request & { routeName?: string }).routeName,
      tenantId: headers["x-rateguard-tenant-id"],
      requestId: headers["x-request-id"],
      correlationId: headers["x-correlation-id"],
    };
  }

  return {
    ...input,
    request: (input as RateGuardContext).request,
  };
}

function resolvePolicyName(input: RateGuardContext | undefined, defaultPolicy = "default") {
  return input?.policy || input?.routeName || input?.endpoint || input?.path || defaultPolicy;
}

export type RateGuardInitOptions = RateGuardBuilderOptions;

export class RateGuard {
  private readonly client: RateGuardClient;
  private readonly logger = createLogger();
  private readonly plugins: PluginRegistry;
  private readonly policies = new Map<string, RateGuardPolicyDefinition>();
  private readonly policyVersions = new Map<string, RateGuardPolicyDefinition[]>();
  private readonly policyCompiler = createPolicyCompiler({
    resolvePolicy: (name) => this.policies.get(name),
  });
  private readonly analyticsLedger = new Map<string, { allowed: number; blocked: number; total: number; lastRequestAt?: string }>();
  private initialized = false;

  constructor(options: RateGuardInitOptions) {
    const resolvedLogger = options.logger || createLogger({ format: "json" });
    const resolvedTransport = options.transport as RateGuardTransport | undefined;

    this.client = new RateGuardClient({
      ...options,
      logger: resolvedLogger,
      transport: resolvedTransport,
    });
    this.plugins = createPluginRegistry(options.plugins ?? []);
    this.registerDefaultPolicy();
  }

  static builder() {
    return new RateGuardBuilder();
  }

  private async runInitHooks() {
    if (this.initialized) return;
    const ctx = { client: this, config: this.clientConfig(), services: this.plugins.servicesSnapshot() };
    await this.plugins.runHook("beforeInit", ctx);
    this.initialized = true;
    await this.plugins.runHook("afterInit", ctx);
  }

  private clientConfig(): RateGuardInitOptions {
    return this.client.config;
  }

  private registerDefaultPolicy() {
    if (!this.policies.has("default")) {
      this.savePolicyVersion("default", {
        name: "default",
        limit: 100,
        window: "1m",
      });
    }
  }

  private savePolicyVersion(name: string, policy: RateGuardPolicyDefinition) {
    this.policies.set(name, { ...policy, version: policy.version ?? ((this.policyVersions.get(name)?.at(-1)?.version ?? 0) + 1) });
    const history = this.policyVersions.get(name) || [];
    history.push({ ...this.policies.get(name)! });
    this.policyVersions.set(name, history);
  }

  private recordAnalytics(policy: string, allowed: boolean) {
    const entry = this.analyticsLedger.get(policy) || { allowed: 0, blocked: 0, total: 0 };
    entry.total += 1;
    entry.lastRequestAt = now();
    if (allowed) entry.allowed += 1;
    else entry.blocked += 1;
    this.analyticsLedger.set(policy, entry);
  }

  use(plugin: RateGuardPlugin) {
    this.plugins.register(plugin);
    return this;
  }

  policy(name: string) {
    return new PolicyBuilder(name, (policy) => {
      this.savePolicyVersion(name, policy);
    });
  }

  middleware(options: { failMode?: RateGuardInitOptions["failMode"] } = {}): RequestHandler {
    return this.client.middleware({
      failMode: options.failMode,
      onDecision: async (result, req) => {
        const requestContext: RateGuardContext = {
          request: req,
          endpoint: req.path,
          path: req.path,
          routeName: (req as Request & { routeName?: string }).routeName,
          policy: (req as Request & { policy?: string }).policy,
          requestId: req.headers["x-request-id"]?.toString(),
          correlationId: req.headers["x-correlation-id"]?.toString(),
        };
        const policy = resolvePolicyName(requestContext);
        const afterRequestCtx = await this.plugins.runHook("afterRequest", {
          client: this,
          config: this.clientConfig(),
          request: normalizeInput(req),
          result: {
            ...result,
            policy,
            window: this.policies.get(policy)?.window ?? "1m",
          },
          services: this.plugins.servicesSnapshot(),
          decision: result.allowed ? "allow" : "block",
          phase: "afterRequest",
        });
        await this.plugins.runHook("beforeDecision", {
          ...afterRequestCtx,
          request: requestContext,
          result: result as RateGuardPolicyResult,
          decision: result.allowed ? "allow" : "block",
          phase: "beforeDecision",
        });
        await this.plugins.runHook("afterDecision", {
          ...afterRequestCtx,
          request: requestContext,
          result: result as RateGuardPolicyResult,
          decision: result.allowed ? "allow" : "block",
          phase: "afterDecision",
        });
        this.recordAnalytics(policy, result.allowed);
      },
      identifier: (req) => req.headers["x-user-id"]?.toString() || req.ip || "anonymous",
    });
  }

  private async evaluatePolicy(policy: RateGuardPolicyDefinition, input: RateGuardContext, simulation?: RateGuardPolicySimulationResult) {
    const pluginCtx: RateGuardLifecycleContext = {
      client: this,
      config: this.clientConfig(),
      request: input,
      services: this.plugins.servicesSnapshot(),
      phase: "beforeRequest",
    };

    const beforeRequestCtx = await this.plugins.runHook("beforeRequest", pluginCtx);
    const request = beforeRequestCtx.request || input;
    const resolved = resolvePolicyContext(policy, request);
    const result = await this.client.check({
      identifier: resolved.identifier,
      endpoint: resolved.endpoint,
      method: resolved.method,
      smartMode: policy.smartMode,
      tenantId: request.tenantId,
      failMode: policy.failMode,
    });

    const policyResult: RateGuardPolicyResult = {
      ...result,
      policy: policy.name,
      window: simulation?.effectiveWindow ?? policy.window,
      limit: simulation?.effectiveLimit ?? policy.limit,
    };
    const beforeDecisionCtx = await this.plugins.runHook("beforeDecision", {
      ...beforeRequestCtx,
      request,
      result: policyResult,
      decision: policyResult.allowed ? "allow" : "block",
      phase: "beforeDecision",
    });

    const decisionResult = beforeDecisionCtx.result || policyResult;
    this.recordAnalytics(policy.name, decisionResult.allowed);

    await this.plugins.runHook("afterRequest", {
      ...beforeDecisionCtx,
      request,
      result: decisionResult,
      decision: decisionResult.allowed ? "allow" : "block",
      phase: "afterRequest",
    });

    await this.plugins.runHook("afterDecision", {
      ...beforeDecisionCtx,
      request,
      result: decisionResult,
      decision: decisionResult.allowed ? "allow" : "block",
      phase: "afterDecision",
    });

    return decisionResult;
  }

  async limit(input?: RateGuardProgrammaticLimitOptions | RateGuardContext | Request | string) {
    const result = await this.check(input);
    if (!result.allowed) {
      throw new RateLimitExceededError("Rate limit exceeded.", {
        requestId: result.requestId ?? null,
        retryAfter: result.retryAfter ?? null,
        backend: result.backend ?? null,
        details: {
          policy: result.policy,
          limit: result.limit,
          remaining: result.remaining,
        },
      });
    }

    return result;
  }

  async check(input?: RateGuardProgrammaticLimitOptions | RateGuardContext | Request | string) {
    await this.runInitHooks();
    const normalized = normalizeInput(input);
    const policyName = resolvePolicyName(normalized);
    const policy = this.policies.get(policyName) || this.policies.get("default");

    if (!policy) {
      throw new ConfigurationError(`No policy registered for "${policyName}".`, {
        details: { policyName },
      });
    }

    const merged: RateGuardContext = {
      ...normalized,
      policy: policy.name,
      identifier: normalized.identifier,
      endpoint: normalized.endpoint ?? normalized.path,
      method: normalized.method,
      tenantId: normalized.tenantId,
      country: normalized.country,
      region: normalized.region,
      asn: normalized.asn,
      tier: normalized.tier,
      workspaceId: normalized.workspaceId,
      projectId: normalized.projectId,
      environmentId: normalized.environmentId,
      cost: normalized.cost,
      metadata: normalized.metadata,
    };
    const compiled = this.policyCompiler.optimize(this.policyCompiler.compile(policy));
    const simulation = this.policyCompiler.simulate({
      policy,
      context: merged,
    });
    const decision = await this.evaluatePolicy(policy, merged, simulation);

    return {
      ...decision,
      limit: simulation.effectiveLimit ?? decision.limit,
      window: simulation.effectiveWindow ?? decision.window,
      warning: decision.warning || policy.shadow || policy.simulate || simulation.warnings.length > 0,
      shadowMode: decision.shadowMode || policy.shadow || policy.simulate,
      reason: decision.reason || (simulation.matchedRule ? `policy:${simulation.matchedRule}` : undefined),
      policyHash: compiled.hash,
      policyVersion: compiled.version,
    } as RateLimitResult & {
      policyHash?: string;
      policyVersion?: number;
    };
  }

  analytics() {
    const snapshot = [...this.analyticsLedger.entries()].map(([policy, entry]) => ({
      policy,
      ...entry,
    }));

    return {
      snapshot: () => snapshot,
      summary: (): RateGuardAnalyticsSummary[] =>
        snapshot.map((entry) => ({
          policy: entry.policy,
          allowed: entry.blocked === 0,
          totalRequests: entry.total,
          allowedRequests: entry.allowed,
          blockedRequests: entry.blocked,
          lastRequestAt: entry.lastRequestAt ?? null,
        })),
      export: () => ({ generatedAt: now(), policies: snapshot }),
    };
  }

  async health(): Promise<RateGuardHealthStatus> {
    const started = Date.now();
    const response = await fetch(`${this.client.config.baseURL}/v1/health`, {
      headers: {
        "x-api-key": this.client.config.apiKey,
        "x-rateguard-tenant-id": this.client.config.tenantId || "",
      },
    });

    const body: unknown = await response.json().catch(() => null);
    const diagnostics = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    return {
      ok: response.ok,
      backend: this.client.config.baseURL,
      redis: typeof diagnostics.redis === "string" ? diagnostics.redis : undefined,
      version: typeof diagnostics.backendVersion === "string" ? diagnostics.backendVersion : SDK_VERSION,
      latencyMs: Date.now() - started,
      diagnostics,
    };
  }

  async shutdown() {
    const ctx = { client: this, config: this.clientConfig(), services: this.plugins.servicesSnapshot() };
    await this.plugins.runHook("beforeShutdown", ctx);
    await this.client.dispose();
    await this.plugins.runHook("afterShutdown", ctx);
  }

  async dispose() {
    await this.shutdown();
  }

  pluginRegistry() {
    return this.plugins;
  }
}

export class RateGuardBuilder {
  private options: RateGuardInitOptions = {
    apiKey: "",
  };
  private readonly plugins: RateGuardPlugin[] = [];

  apiKey(apiKey: string) {
    this.options.apiKey = apiKey;
    return this;
  }

  baseURL(baseURL: string) {
    this.options.baseURL = baseURL;
    return this;
  }

  timeout(timeout: number) {
    this.options.timeout = timeout;
    return this;
  }

  retry(retries: number, retryDelayMs?: number) {
    this.options.retries = retries;
    if (retryDelayMs !== undefined) {
      this.options.retryDelayMs = retryDelayMs;
    }
    return this;
  }

  failMode(failMode: NonNullable<RateGuardInitOptions["failMode"]>) {
    this.options.failMode = failMode;
    return this;
  }

  logger(logger: NonNullable<RateGuardInitOptions["logger"]>) {
    this.options.logger = logger;
    return this;
  }

  transport(transport: NonNullable<RateGuardInitOptions["transport"]>) {
    this.options.transport = transport;
    return this;
  }

  plugin(plugin: RateGuardPlugin) {
    this.plugins.push(plugin);
    return this;
  }

  tenantId(tenantId: string) {
    this.options.tenantId = tenantId;
    return this;
  }

  build() {
    const rateGuard = new RateGuard(this.options);
    for (const plugin of this.plugins) {
      rateGuard.use(plugin);
    }
    return rateGuard;
  }
}

export function createRateGuard(options: RateGuardInitOptions) {
  return new RateGuard(options);
}

export function serializeRateGuardError(error: unknown) {
  return serializeError(error);
}
