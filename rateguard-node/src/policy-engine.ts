import { createHash } from "node:crypto";
import type {
  RateGuardCompiledPolicy,
  RateGuardCompiledPolicyRule,
  RateGuardContext,
  RateGuardPolicyCompilationWarning,
  RateGuardPolicyCondition,
  RateGuardPolicyConditionGroup,
  RateGuardPolicyDefinition,
  RateGuardPolicyDiff,
  RateGuardPolicyLogic,
  RateGuardPolicyRule,
  RateGuardPolicySimulationResult,
  RateGuardPolicyStrategy,
} from "./types.js";

export interface PolicyCompilerOptions {
  resolvePolicy?: (name: string) => RateGuardPolicyDefinition | undefined;
}

export interface PolicyTemplateDefinition {
  name: string;
  description: string;
  policy: RateGuardPolicyDefinition;
}

export interface PolicySimulationInput {
  policy: RateGuardPolicyDefinition;
  context: RateGuardContext;
}

const STRATEGY_PRIORITY: Record<RateGuardPolicyStrategy, number> = {
  "sliding-window": 0,
  "fixed-window": 1,
  "token-bucket": 2,
  "leaky-bucket": 3,
  burst: 4,
  concurrency: 5,
  adaptive: 6,
  weighted: 7,
};

const DEFAULT_TEMPLATES: PolicyTemplateDefinition[] = [
  {
    name: "api-protection",
    description: "Balanced protection for general API traffic.",
    policy: {
      name: "api-protection",
      limit: 1000,
      window: "1m",
      strategy: ["token-bucket", "sliding-window"],
      rules: [
        {
          id: "baseline",
          name: "Baseline requests",
          priority: 100,
          strategy: "sliding-window",
          limit: 1000,
          window: "1m",
          allOf: [{ field: "endpoint", operator: "exists", value: true }],
        },
      ],
    },
  },
  {
    name: "burst-sensitive",
    description: "Strict burst control for login and checkout flows.",
    policy: {
      name: "burst-sensitive",
      limit: 100,
      window: "30s",
      burst: 20,
      strategy: ["burst", "token-bucket"],
      rules: [
        {
          id: "critical-endpoints",
          strategy: "burst",
          limit: 20,
          burst: 20,
          window: "30s",
          anyOf: [{ field: "endpoint", operator: "regex", value: "^/login|^/checkout" }],
        },
      ],
    },
  },
  {
    name: "geo-tier-hybrid",
    description: "Combines geo and tier targeting with fallback protection.",
    policy: {
      name: "geo-tier-hybrid",
      limit: 500,
      window: "5m",
      strategy: ["weighted", "adaptive", "fixed-window"],
      rules: [
        {
          id: "enterprise",
          priority: 50,
          strategy: "weighted",
          weight: 0.5,
          limit: 2000,
          window: "5m",
          allOf: [{ field: "tier", operator: "eq", value: "enterprise" }],
        },
        {
          id: "geo-block",
          priority: 10,
          strategy: "fixed-window",
          limit: 100,
          window: "5m",
          anyOf: [{ field: "country", operator: "in", values: ["RU", "KP"] }],
        },
      ],
    },
  },
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
}

function hashPolicy(policy: RateGuardPolicyDefinition, rules: RateGuardCompiledPolicyRule[]) {
  return createHash("sha256").update(stableStringify({ policy, rules })).digest("hex").slice(0, 16);
}

function getContextValue(ctx: RateGuardContext, field: string) {
  switch (field) {
    case "identifier":
    case "ip":
    case "path":
    case "routeName":
    case "endpoint":
    case "method":
    case "tenantId":
    case "policy":
    case "requestId":
    case "correlationId":
    case "traceId":
    case "country":
    case "region":
    case "asn":
    case "tier":
    case "workspaceId":
    case "projectId":
    case "environmentId":
      return ctx[field];
    case "cost":
      return ctx.cost;
    case "hour":
    case "day": {
      const source = ctx.request && typeof ctx.request === "object" ? (ctx.request as Record<string, unknown>) : undefined;
      const timeValue = typeof source?.createdAt === "string" ? new Date(source.createdAt) : new Date();
      return field === "hour" ? timeValue.getUTCHours() : timeValue.getUTCDate();
    }
    case "metadata":
      return ctx.metadata;
    default:
      return undefined;
  }
}

function compareValue(actual: unknown, operator: RateGuardPolicyCondition["operator"], expected: unknown, expectedValues?: unknown[]) {
  switch (operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expectedValues) && expectedValues.some((value) => value === actual);
    case "nin":
      return Array.isArray(expectedValues) && !expectedValues.some((value) => value === actual);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return typeof actual === "string" && String(actual).includes(String(expected ?? ""));
    case "startsWith":
      return typeof actual === "string" && String(actual).startsWith(String(expected ?? ""));
    case "endsWith":
      return typeof actual === "string" && String(actual).endsWith(String(expected ?? ""));
    case "regex":
      try {
        return typeof actual === "string" && new RegExp(String(expected ?? "")).test(actual);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateCondition(ctx: RateGuardContext, condition: RateGuardPolicyCondition): boolean {
  const actual = getContextValue(ctx, condition.field);
  const result = compareValue(actual, condition.operator, condition.value, condition.values);
  return condition.negate ? !result : result;
}

function evaluateGroup(ctx: RateGuardContext, group?: RateGuardPolicyConditionGroup, logic: RateGuardPolicyLogic = "all") {
  if (!group) return true;

  const allMatch = (group.allOf || []).every((condition) => evaluateCondition(ctx, condition));
  const anyMatch = (group.anyOf || []).some((condition) => evaluateCondition(ctx, condition));
  const noneMatch = (group.noneOf || []).every((condition) => !evaluateCondition(ctx, condition));

  if (logic === "all") {
    return allMatch && ((group.anyOf?.length ?? 0) === 0 || anyMatch) && noneMatch;
  }

  if (logic === "any") {
    return anyMatch || allMatch;
  }

  return !(allMatch || anyMatch);
}

function normalizeStrategy(strategy: RateGuardPolicyStrategy | RateGuardPolicyStrategy[] | undefined, fallback: RateGuardPolicyStrategy) {
  if (!strategy) return fallback;
  if (Array.isArray(strategy)) {
    return [...strategy].sort((left, right) => STRATEGY_PRIORITY[left] - STRATEGY_PRIORITY[right])[0] || fallback;
  }
  return strategy;
}

function mergeRule(base: RateGuardPolicyDefinition, rule: RateGuardPolicyRule, path: string[]): RateGuardCompiledPolicyRule {
  const strategy = normalizeStrategy(rule.strategy ?? base.strategy, normalizeStrategy(base.strategy, "sliding-window"));
  const limit = Number(rule.limit ?? base.limit ?? 0) || 0;
  const window = rule.window ?? base.window;
  const weight = Number(rule.weight ?? base.weight ?? 1) || 1;
  const cost = Number(rule.cost ?? base.cost ?? 1) || 1;
  const burst = Number(rule.burst ?? base.burst ?? limit) || limit;
  const concurrency = Number(rule.concurrency ?? base.concurrency ?? 0) || 0;

  return {
    ...rule,
    path,
    strategy,
    effectiveStrategy: strategy,
    effectiveLimit: Math.max(1, Math.floor(limit / Math.max(weight, 0.01))),
    effectiveWindow: window,
    score: (rule.priority ?? base.priority ?? 0) + cost + burst + concurrency,
  };
}

function flattenRules(policy: RateGuardPolicyDefinition, warnings: RateGuardPolicyCompilationWarning[], path: string[] = []): RateGuardCompiledPolicyRule[] {
  const compiled: RateGuardCompiledPolicyRule[] = [];
  const rootPath = [...path, policy.name];
  const rules = policy.rules || [];

  for (const rule of rules) {
    const rulePath = [...rootPath, rule.id || rule.name || `rule-${compiled.length + 1}`];
    if (!rule.enabled && rule.enabled !== undefined) {
      continue;
    }

    if (!rule.limit && !policy.limit) {
      warnings.push({
        code: "missing-limit",
        message: `Policy rule "${rule.id || rule.name || rulePath.join(".")}" is missing a limit.`,
        policy: policy.name,
        rule: rule.id || rule.name,
      });
    }

    compiled.push(mergeRule(policy, rule, rulePath));

    if (rule.children?.length) {
      const childPolicy = {
        ...policy,
        ...rule,
        name: `${policy.name}.${rule.id || rule.name || "child"}`,
        rules: rule.children,
      } as RateGuardPolicyDefinition;
      compiled.push(...flattenRules(childPolicy, warnings, rulePath));
    }
  }

  if (!rules.length) {
    compiled.push({
      id: policy.id || policy.name,
      name: policy.name,
      path: rootPath,
      strategy: normalizeStrategy(policy.strategy, "sliding-window"),
      effectiveStrategy: normalizeStrategy(policy.strategy, "sliding-window"),
      effectiveLimit: Math.max(1, policy.limit || 1),
      effectiveWindow: policy.window,
      score: Number(policy.priority ?? 0),
      limit: policy.limit,
      window: policy.window,
      enabled: policy.enabled,
      priority: policy.priority,
    });
  }

  return compiled.sort((left, right) => right.score - left.score);
}

export class PolicyCompiler {
  constructor(private readonly options: PolicyCompilerOptions = {}) {}

  resolve(name: string) {
    return this.options.resolvePolicy?.(name);
  }

  validate(policy: RateGuardPolicyDefinition) {
    const warnings: RateGuardPolicyCompilationWarning[] = [];
    const errors: string[] = [];

    if (!policy.name || !policy.name.trim()) {
      errors.push("Policy name is required.");
    }

    if (!Number.isFinite(policy.limit) || policy.limit <= 0) {
      errors.push(`Policy "${policy.name}" must define a positive limit.`);
    }

    if (!policy.window) {
      errors.push(`Policy "${policy.name}" must define a window.`);
    }

    if (policy.rules?.length) {
      for (const rule of policy.rules) {
        if (rule.limit !== undefined && rule.limit <= 0) {
          errors.push(`Policy rule "${rule.id || rule.name || policy.name}" must define a positive limit.`);
        }
        if (rule.concurrency !== undefined && rule.concurrency < 0) {
          errors.push(`Policy rule "${rule.id || rule.name || policy.name}" must define a non-negative concurrency.`);
        }
        if (rule.weight !== undefined && rule.weight <= 0) {
          errors.push(`Policy rule "${rule.id || rule.name || policy.name}" must define a positive weight.`);
        }
      }
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  compile(policy: RateGuardPolicyDefinition): RateGuardCompiledPolicy {
    const validation = this.validate(policy);
    const warnings = [...validation.warnings];
    const parent = policy.parentPolicy ? this.resolve(policy.parentPolicy) : undefined;
    const mergedPolicy = (parent
      ? {
          ...parent,
          ...policy,
          name: policy.name,
          rules: [...(parent.rules || []), ...(policy.rules || [])],
        }
      : policy) as RateGuardPolicyDefinition;

    const rules = flattenRules(mergedPolicy, warnings);
    const version = Number(mergedPolicy.version ?? 1);
    const hash = hashPolicy(mergedPolicy, rules);

    return {
      name: mergedPolicy.name,
      version,
      hash,
      policy: mergedPolicy,
      rules,
      warnings,
    };
  }

  optimize(compiled: RateGuardCompiledPolicy): RateGuardCompiledPolicy {
    const unique = new Map<string, RateGuardCompiledPolicyRule>();
    for (const rule of compiled.rules) {
      const key = stableStringify({
        limit: rule.effectiveLimit,
        window: rule.effectiveWindow,
        strategy: rule.effectiveStrategy,
        path: rule.path,
        priority: rule.priority,
      });
      if (!unique.has(key)) {
        unique.set(key, rule);
      }
    }

    return {
      ...compiled,
      rules: [...unique.values()].sort((left, right) => right.score - left.score),
    };
  }

  diff(previous: RateGuardCompiledPolicy, next: RateGuardCompiledPolicy): RateGuardPolicyDiff {
    const previousRules = new Map(previous.rules.map((rule) => [rule.id || rule.name || rule.path.join("."), rule]));
    const nextRules = new Map(next.rules.map((rule) => [rule.id || rule.name || rule.path.join("."), rule]));

    const addedRules: string[] = [];
    const removedRules: string[] = [];
    const changedRules: string[] = [];

    for (const key of nextRules.keys()) {
      if (!previousRules.has(key)) {
        addedRules.push(key);
        continue;
      }

      const left = previousRules.get(key)!;
      const right = nextRules.get(key)!;
      if (stableStringify(left) !== stableStringify(right)) {
        changedRules.push(key);
      }
    }

    for (const key of previousRules.keys()) {
      if (!nextRules.has(key)) {
        removedRules.push(key);
      }
    }

    return {
      addedRules,
      removedRules,
      changedRules,
      versionFrom: previous.version,
      versionTo: next.version,
    };
  }

  rollback(history: RateGuardCompiledPolicy[], version: number) {
    return history.find((entry) => entry.version === version);
  }

  simulate(input: PolicySimulationInput): RateGuardPolicySimulationResult {
    const compiled = this.optimize(this.compile(input.policy));
    const matched = compiled.rules.find((rule) => evaluateGroup(input.context, rule, input.policy.logic ?? "all"));
    const effectiveRule = matched || compiled.rules[0];
    const allowed = !!effectiveRule;

    return {
      policy: compiled.name,
      version: compiled.version,
      hash: compiled.hash,
      allowed,
      matchedRule: matched?.id || matched?.name,
      effectiveLimit: effectiveRule?.effectiveLimit ?? compiled.policy.limit,
      effectiveWindow: effectiveRule?.effectiveWindow ?? compiled.policy.window,
      effectiveStrategy: effectiveRule?.effectiveStrategy ?? normalizeStrategy(compiled.policy.strategy, "sliding-window"),
      warnings: compiled.warnings,
      context: input.context,
    };
  }
}

export function createPolicyCompiler(options: PolicyCompilerOptions = {}) {
  return new PolicyCompiler(options);
}

export function listPolicyTemplates() {
  return DEFAULT_TEMPLATES.map((template) => ({ ...template, policy: { ...template.policy, rules: template.policy.rules?.map((rule) => ({ ...rule })) } }));
}

export function getPolicyTemplate(name: string) {
  return listPolicyTemplates().find((template) => template.name === name);
}

export function createPolicyTemplate(name: string, policy: RateGuardPolicyDefinition, description: string): PolicyTemplateDefinition {
  return {
    name,
    description,
    policy,
  };
}

export function compilePolicy(policy: RateGuardPolicyDefinition, resolvePolicy?: PolicyCompilerOptions["resolvePolicy"]) {
  return createPolicyCompiler({ resolvePolicy }).compile(policy);
}

export function simulatePolicy(input: PolicySimulationInput, resolvePolicy?: PolicyCompilerOptions["resolvePolicy"]) {
  return createPolicyCompiler({ resolvePolicy }).simulate(input);
}
