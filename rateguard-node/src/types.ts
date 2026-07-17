import type { RequestHandler, Request } from "express";
import type { RateGuardError } from "./errors.js";

export type FailMode = "failClosed" | "failOpen" | "warnOnly" | "shadowMode";

export type RateGuardHookName =
  | "beforeInit"
  | "afterInit"
  | "beforeRequest"
  | "afterRequest"
  | "beforeDecision"
  | "afterDecision"
  | "beforeShutdown"
  | "afterShutdown";

export type RateGuardLogLevel = "debug" | "info" | "warn" | "error";

export type RateGuardPluginPriority = number;

export type MaybePromise<T> = T | Promise<T>;

export type RateGuardPluginDependency = string;

export interface RateGuardPluginMetadata {
  name: string;
  version?: string;
  description?: string;
  priority?: RateGuardPluginPriority;
  enabled?: boolean;
  dependencies?: RateGuardPluginDependency[];
  tags?: string[];
}

export interface RateGuardPluginRegistration {
  enabled: boolean;
  priority: RateGuardPluginPriority;
  metadata: RateGuardPluginMetadata;
}

export interface RateGuardPluginServices {
  middlewares: RateGuardMiddleware[];
  commands: Map<string, RateGuardPluginCommand>;
  storage?: RateGuardStorageAdapter;
  transport?: RateGuardTransport;
  logger?: RateGuardLogger;
  telemetry?: unknown;
  registerMiddleware: (middleware: RateGuardMiddleware) => void;
  registerCommand: (command: RateGuardPluginCommand) => void;
  injectStorage: (storage: RateGuardStorageAdapter) => void;
  injectTransport: (transport: RateGuardTransport) => void;
  injectLogger: (logger: RateGuardLogger) => void;
  injectTelemetry: (telemetry: unknown) => void;
}

export interface RateGuardPluginCommand {
  name: string;
  description?: string;
  execute: (ctx: RateGuardLifecycleContext) => MaybePromise<unknown>;
}

export interface RateGuardStorageAdapter {
  get<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
  set<T = unknown>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}

export interface RateGuardTransportRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  signal: AbortSignal;
}

export interface RateGuardTransportResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface RateGuardTransport {
  send(request: RateGuardTransportRequest): Promise<RateGuardTransportResponse>;
  close?(): Promise<void> | void;
}

export interface RateGuardLogger {
  level?: RateGuardLogLevel;
  debug?(message: string, meta?: unknown): void;
  info?(message: string, meta?: unknown): void;
  warn?(message: string, meta?: unknown): void;
  error?(message: string, meta?: unknown): void;
  child?(bindings: Record<string, unknown>): RateGuardLogger;
  withContext?(bindings: Record<string, unknown>): RateGuardLogger;
}

export interface RateGuardClientOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelayMs?: number;
  failMode?: FailMode;
  tenantId?: string;
  documentationURL?: string;
  userAgent?: string;
  logger?: RateGuardLogger;
  transport?: RateGuardTransport | ((request: RateGuardTransportRequest) => Promise<RateGuardTransportResponse>);
  plugins?: RateGuardPlugin[];
}

export interface RateGuardContext {
  request?: Request | Record<string, unknown>;
  identifier?: string;
  ip?: string;
  path?: string;
  routeName?: string;
  endpoint?: string;
  method?: string;
  tenantId?: string;
  policy?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  country?: string;
  region?: string;
  asn?: string;
  tier?: string;
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
  cost?: number;
}

export type RateGuardIdentifierResolver = (ctx: RateGuardContext) => string;
export type RateGuardEndpointResolver = (ctx: RateGuardContext) => string;
export type RateGuardMethodResolver = (ctx: RateGuardContext) => string;

export type RateGuardPolicyStrategy =
  | "sliding-window"
  | "fixed-window"
  | "token-bucket"
  | "leaky-bucket"
  | "burst"
  | "concurrency"
  | "adaptive"
  | "weighted";

export type RateGuardPolicyLogic = "all" | "any" | "none";

export type RateGuardPolicyComparison =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "regex"
  | "exists";

export type RateGuardPolicyField =
  | "identifier"
  | "ip"
  | "path"
  | "routeName"
  | "endpoint"
  | "method"
  | "tenantId"
  | "policy"
  | "requestId"
  | "correlationId"
  | "traceId"
  | "country"
  | "region"
  | "asn"
  | "tier"
  | "workspaceId"
  | "projectId"
  | "environmentId"
  | "cost"
  | "hour"
  | "day"
  | "metadata";

export interface RateGuardPolicyCondition {
  field: RateGuardPolicyField;
  operator: RateGuardPolicyComparison;
  value?: string | number | boolean | null | Record<string, unknown>;
  values?: Array<string | number | boolean | null>;
  negate?: boolean;
}

export interface RateGuardPolicyConditionGroup {
  allOf?: RateGuardPolicyCondition[];
  anyOf?: RateGuardPolicyCondition[];
  noneOf?: RateGuardPolicyCondition[];
}

export interface RateGuardPolicyRule extends RateGuardPolicyConditionGroup {
  id?: string;
  name?: string;
  priority?: number;
  enabled?: boolean;
  strategy?: RateGuardPolicyStrategy;
  limit?: number;
  window?: string | number;
  burst?: number;
  concurrency?: number;
  weight?: number;
  cost?: number;
  mode?: "enforce" | "shadow" | "simulate";
  endpoint?: string;
  method?: string;
  identifier?: string;
  tenantId?: string;
  countries?: string[];
  regions?: string[];
  tiers?: string[];
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
  fallbackPolicy?: string;
  children?: RateGuardPolicyRule[];
}

export interface RateGuardPolicyDefinition {
  name: string;
  limit: number;
  window: string | number;
  identifier?: RateGuardIdentifierResolver;
  endpoint?: string | RateGuardEndpointResolver;
  method?: string | RateGuardMethodResolver;
  failMode?: FailMode;
  smartMode?: boolean;
  description?: string;
  priority?: number;
  enabled?: boolean;
  dependencies?: string[];
  id?: string;
  version?: number;
  parentPolicy?: string;
  fallbackPolicy?: string;
  template?: string;
  strategy?: RateGuardPolicyStrategy | RateGuardPolicyStrategy[];
  logic?: RateGuardPolicyLogic;
  shadow?: boolean;
  simulate?: boolean;
  metadata?: Record<string, unknown>;
  conditions?: RateGuardPolicyConditionGroup;
  rules?: RateGuardPolicyRule[];
  weight?: number;
  burst?: number;
  concurrency?: number;
  cost?: number;
  countries?: string[];
  regions?: string[];
  tiers?: string[];
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
}

export interface RateGuardPolicyResult extends RateLimitResult {
  policy: string;
  limit: number;
  window: string | number;
}

export interface RateGuardPluginContext {
  client: unknown;
  config: RateGuardClientOptions;
  services: RateGuardPluginServices;
}

export interface RateGuardLifecycleContext extends RateGuardPluginContext {
  request?: RateGuardContext;
  result?: RateGuardPolicyResult;
  error?: RateGuardError | Error;
  decision?: "allow" | "block" | "warn" | "degraded";
  phase?: RateGuardHookName;
}

export interface RateGuardPlugin {
  name: string;
  metadata?: Partial<RateGuardPluginMetadata>;
  enabled?: boolean;
  priority?: number;
  dependencies?: string[];
  validate?(ctx: RateGuardPluginContext): MaybePromise<void>;
  beforeInit?(ctx: RateGuardPluginContext): MaybePromise<void | Partial<RateGuardPluginContext>>;
  afterInit?(ctx: RateGuardPluginContext): MaybePromise<void | Partial<RateGuardPluginContext>>;
  beforeRequest?(ctx: RateGuardLifecycleContext): MaybePromise<void | Partial<RateGuardLifecycleContext>>;
  afterRequest?(ctx: RateGuardLifecycleContext): MaybePromise<void | Partial<RateGuardLifecycleContext>>;
  beforeDecision?(ctx: RateGuardLifecycleContext): MaybePromise<void | Partial<RateGuardLifecycleContext>>;
  afterDecision?(ctx: RateGuardLifecycleContext): MaybePromise<void | Partial<RateGuardLifecycleContext>>;
  beforeShutdown?(ctx: RateGuardPluginContext): MaybePromise<void | Partial<RateGuardPluginContext>>;
  afterShutdown?(ctx: RateGuardPluginContext): MaybePromise<void | Partial<RateGuardPluginContext>>;
}

export interface RateGuardRequestOptions {
  identifier: string;
  endpoint?: string;
  method?: string;
  smartMode?: boolean;
  tenantId?: string;
  headers?: Record<string, string>;
  failMode?: FailMode;
  metadata?: Record<string, unknown>;
  policy?: string;
}

export interface RateGuardMiddlewareOptions {
  identifier?: string | ((req: Request) => string);
  endpoint?: string | ((req: Request) => string);
  method?: string | ((req: Request) => string);
  skip?: (req: Request) => boolean;
  tenantId?: string | ((req: Request) => string | undefined);
  headers?: Record<string, string> | ((req: Request) => Record<string, string>);
  smartMode?: boolean;
  failMode?: FailMode;
  onDecision?: (result: RateLimitResult, req: Request) => void | Promise<void>;
  onError?: (error: Error, req: Request) => void | Promise<void>;
}

export type RateGuardBuilderOptions = RateGuardClientOptions;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset?: number | null;
  retryAfter?: number;
  ruleId?: string | null;
  warning?: boolean;
  message?: string;
  reason?: string;
  violations?: number;
  requestId?: string | null;
  backend?: string;
  timestamp?: string;
  shadowMode?: boolean;
  policy?: string;
  policyHash?: string;
  policyVersion?: number;
}

export interface RateGuardLimitOptions {
  identifier: string;
  endpoint?: string;
  method?: string;
  smartMode?: boolean;
  tenantId?: string;
  headers?: Record<string, string>;
  failMode?: FailMode;
}

export interface RateGuardProgrammaticLimitOptions {
  policy?: string;
  identifier?: string;
  endpoint?: string;
  method?: string;
  tenantId?: string;
  smartMode?: boolean;
  headers?: Record<string, string>;
  failMode?: FailMode;
  request?: RateGuardContext;
  country?: string;
  region?: string;
  asn?: string;
  tier?: string;
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
}

export interface RateGuardPolicyCompilationWarning {
  code: string;
  message: string;
  policy?: string;
  rule?: string;
}

export interface RateGuardCompiledPolicyRule extends RateGuardPolicyRule {
  path: string[];
  effectiveLimit: number;
  effectiveWindow: string | number;
  effectiveStrategy: RateGuardPolicyStrategy;
  score: number;
}

export interface RateGuardCompiledPolicy {
  name: string;
  version: number;
  hash: string;
  policy: RateGuardPolicyDefinition;
  rules: RateGuardCompiledPolicyRule[];
  warnings: RateGuardPolicyCompilationWarning[];
}

export interface RateGuardPolicySimulationResult {
  policy: string;
  version: number;
  hash: string;
  allowed: boolean;
  matchedRule?: string;
  effectiveLimit: number;
  effectiveWindow: string | number;
  effectiveStrategy: RateGuardPolicyStrategy;
  warnings: RateGuardPolicyCompilationWarning[];
  context: RateGuardContext;
}

export interface RateGuardPolicyDiff {
  addedRules: string[];
  removedRules: string[];
  changedRules: string[];
  versionFrom: number;
  versionTo: number;
}

export type RateGuardMiddleware = RequestHandler;

export interface RateGuardAnalyticsSummary {
  policy?: string;
  allowed: boolean;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  lastRequestAt?: string | null;
}

export interface RateGuardHealthStatus {
  ok: boolean;
  backend?: string;
  redis?: string;
  version?: string;
  latencyMs?: number;
  diagnostics?: Record<string, unknown>;
}
