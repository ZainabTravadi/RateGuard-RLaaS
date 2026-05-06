import { getConfig } from "./config.js";
import { RateLimitResult } from "./types.js";

function createClientError(message: string, code: string, status?: number): Error {
  const err = new Error(message) as Error & { code?: string; status?: number };
  err.code = code;
  err.status = status;
  return err;
}

function hasCode(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && "code" in error;
}

export async function checkRateLimit(payload: {
  identifier: string;
  endpoint: string;
  method: string;
  smartMode?: boolean;
}): Promise<RateLimitResult> {
  const { apiKey, baseUrl, timeoutMs, debug } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (debug) {
      console.log(`[RateGuard] Checking rate limit at ${baseUrl}/v1/check`, payload);
    }

    const res = await fetch(`${baseUrl}/v1/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Try to read JSON body safely
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    const responseBody = body as {
      error?: string;
      message?: string;
      allowed?: boolean;
      limit?: number | string;
      remaining?: number | string;
      reset?: unknown;
      retryAfter?: unknown;
      ruleId?: unknown;
      warning?: unknown;
      reason?: unknown;
      violations?: unknown;
    } | null;

    if (!res.ok) {
      const errorMsg = responseBody?.error ?? responseBody?.message ?? "Unknown error";
      
      if (res.status === 401 || res.status === 403) {
        const msg = `RateGuard authentication failed (${res.status}): missing or invalid API key. Backend: ${baseUrl}`;
        throw createClientError(msg, 'AUTH_ERROR', res.status);
      }

      const msg = `RateGuard API request failed with status ${res.status}: ${errorMsg}. Backend: ${baseUrl}`;
      throw createClientError(msg, 'API_ERROR', res.status);
    }

    // Successful response - normalize fields and coerce types to the SDK types
  const allowed = responseBody?.allowed !== false;
  const limit = Number(responseBody?.limit ?? 0) || 0;
  const remaining = Number(responseBody?.remaining ?? 0) || 0;

  const rawReset = responseBody?.reset;
  const reset = typeof rawReset === "number"
    ? rawReset
    : (typeof rawReset === "string" ? (Number(rawReset) || null) : null);

  const rawRetry = responseBody?.retryAfter;
  const retryAfter = typeof rawRetry === "number"
    ? rawRetry
    : (typeof rawRetry === "string" ? (Number(rawRetry) || undefined) : undefined);

  const rawRuleId = responseBody?.ruleId;
  const ruleId = typeof rawRuleId === "string" ? rawRuleId : null;

  const rawWarning = responseBody?.warning;
  const warning = typeof rawWarning === "boolean" ? rawWarning : undefined;

  const message = typeof responseBody?.message === "string" ? responseBody?.message : undefined;
  const reason = typeof responseBody?.reason === "string" ? responseBody?.reason : undefined;

  const rawViolations = responseBody?.violations;
  const violations = typeof rawViolations === "number"
    ? rawViolations
    : (typeof rawViolations === "string" ? (Number(rawViolations) || undefined) : undefined);

    if (debug) {
      console.log(`[RateGuard] Rate limit decision:`, { allowed, limit, remaining, ruleId });
    }

    const result: RateLimitResult = {
      allowed,
      limit,
      remaining,
      reset,
      retryAfter,
      ruleId,
      warning,
      message,
      reason,
      violations,
    };

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const msg = `RateGuard request timeout after ${timeoutMs}ms. Backend: ${baseUrl}`;
      throw createClientError(msg, 'TIMEOUT');
    }

    if (hasCode(error)) {
      if (debug) {
        console.warn("[RateGuard] Request failed with code:", error.code, error.message);
      }
      throw error;
    }

    if (debug) {
      console.warn("[RateGuard] Request failed:", error instanceof Error ? error.message : String(error));
    }

    const msg = `RateGuard API unreachable (network error). Backend: ${baseUrl}`;
    throw createClientError(msg, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
