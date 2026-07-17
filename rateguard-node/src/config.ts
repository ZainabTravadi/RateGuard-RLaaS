import {
  ConfigurationError,
  ValidationError,
  TransportError,
} from "./errors.js";
import type { FailMode, RateGuardClientOptions } from "./types.js";

const MIN_NODE_MAJOR = 18;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function defaultBaseURL() {
  return process.env.RATEGUARD_BASE_URL || process.env.RATEGUARD_URL || "https://api.rateguard.dev";
}

export interface ResolvedRateGuardConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelayMs: number;
  failMode: FailMode;
  tenantId?: string;
  documentationURL: string;
  userAgent: string;
  logger?: RateGuardClientOptions["logger"];
  transport?: RateGuardClientOptions["transport"];
}

function normalizeFailMode(value: unknown): FailMode {
  if (value === undefined || value === null || value === "") {
    return "failClosed";
  }

  const normalized = String(value);
  if (normalized === "failClosed" || normalized === "failOpen" || normalized === "warnOnly" || normalized === "shadowMode") {
    return normalized;
  }

  throw new ValidationError(
    `Invalid fail mode "${normalized}". Use failClosed, failOpen, warnOnly, or shadowMode.`,
    {
      details: {
        field: "failMode",
        allowedValues: ["failClosed", "failOpen", "warnOnly", "shadowMode"],
      },
      documentationURL: "https://rateguard.dev/docs/fail-modes",
    }
  );
}

export function validateNodeVersion() {
  const major = Number(process.versions.node.split(".")[0] || 0);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    throw new ConfigurationError(
      `RateGuard requires Node.js ${MIN_NODE_MAJOR}+ for native fetch, AbortController, and worker compatibility.`,
      {
        details: {
          currentVersion: process.versions.node,
          requiredVersion: `${MIN_NODE_MAJOR}+`,
        },
        documentationURL: "https://rateguard.dev/docs/installation",
      }
    );
  }
}

export function resolveClientConfig(options: RateGuardClientOptions): ResolvedRateGuardConfig {
  validateNodeVersion();

  if (!options || typeof options !== "object") {
    throw new ConfigurationError("RateGuard client options are required.", {
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  if (!isNonEmptyString(options.apiKey)) {
    const envName = "RATEGUARD_API_KEY";
    throw new ConfigurationError(
      `${envName} is missing.\n\nGenerate one from the dashboard.\nDocumentation: https://rateguard.dev/docs/api-keys`,
      {
        details: { envName },
        documentationURL: "https://rateguard.dev/docs/api-keys",
      }
    );
  }

  const baseURL = options.baseURL || defaultBaseURL();
  let parsed: URL;

  try {
    parsed = new URL(baseURL);
  } catch (cause) {
    throw new ConfigurationError(`Invalid baseURL "${baseURL}". Provide a valid absolute HTTP or HTTPS URL.`, {
      cause,
      details: { field: "baseURL", value: baseURL },
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ConfigurationError(`Invalid baseURL protocol "${parsed.protocol}". Use http:// or https://.`, {
      details: { field: "baseURL", protocol: parsed.protocol },
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  const timeout = options.timeout ?? 5000;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new ValidationError(`Invalid timeout "${timeout}". Timeout must be a positive number of milliseconds.`, {
      details: { field: "timeout", value: timeout },
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  const retries = options.retries ?? 2;
  if (!Number.isInteger(retries) || retries < 0) {
    throw new ValidationError(`Invalid retries "${retries}". Retries must be a non-negative integer.`, {
      details: { field: "retries", value: retries },
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  const retryDelayMs = options.retryDelayMs ?? 100;
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new ValidationError(`Invalid retryDelayMs "${retryDelayMs}". Retry delay must be zero or greater.`, {
      details: { field: "retryDelayMs", value: retryDelayMs },
      documentationURL: "https://rateguard.dev/docs/configuration",
    });
  }

  const failMode = normalizeFailMode(options.failMode);

  return {
    apiKey: options.apiKey.trim(),
    baseURL: parsed.origin.replace(/\/$/, ""),
    timeout,
    retries,
    retryDelayMs,
    failMode,
    tenantId: options.tenantId?.trim() || undefined,
    documentationURL: options.documentationURL || "https://rateguard.dev/docs",
    userAgent: options.userAgent || "@rateguard/node",
    logger: options.logger,
    transport: options.transport,
  };
}

export function normalizeRequestHeaders(headers: Record<string, string | undefined>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    normalized[key.toLowerCase()] = String(value);
  }
  return normalized;
}

export function isTransportLike(value: unknown): value is NonNullable<ResolvedRateGuardConfig["transport"]> {
  return typeof value === "function" || (typeof value === "object" && value !== null && "send" in value);
}

export function createTransportError(message: string, cause: unknown, backend: string) {
  return new TransportError(message, {
    cause,
    backend,
    retryable: true,
    details: { causeType: cause instanceof Error ? cause.name : typeof cause },
    documentationURL: "https://rateguard.dev/docs/troubleshooting",
  });
}

