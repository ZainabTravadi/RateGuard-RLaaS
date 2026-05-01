import { getConfig } from "./config.js";
import { RateLimitResult } from "./types.js";

function createClientError(message: string, code: string, status?: number): Error {
  const err = new Error(message) as Error & { code?: string; status?: number };
  err.code = code;
  err.status = status;
  return err;
}

export async function checkRateLimit(payload: {
  identifier: string;
  endpoint: string;
  method: string;
}): Promise<RateLimitResult> {
  const { apiKey, baseUrl, timeoutMs, debug } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (debug) console.debug('[RateGuard] request', payload);

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
    let body: any = null;
    try { body = await res.json(); } catch (e) { body = null; }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw createClientError('RateGuard authentication failed: missing or invalid API key', 'AUTH_ERROR', res.status);
      }

      if (debug) console.warn('[RateGuard] API non-OK', res.status, body);
      throw createClientError(`RateGuard API request failed with status ${res.status}`, 'API_ERROR', res.status);
    }

    // Successful response - normalize fields
    const allowed = body?.allowed !== false;
    const limit = Number(body?.limit ?? 0) || 0;
    const remaining = Number(body?.remaining ?? 0) || 0;
    const reset = body?.reset ?? null;
    const retryAfter = body?.retryAfter ?? undefined;
    const ruleId = body?.ruleId ?? null;

    const result: RateLimitResult = {
      allowed,
      limit,
      remaining,
      reset,
      retryAfter,
      ruleId,
    };

    if (debug) console.debug('[RateGuard] response', result);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw createClientError(`RateGuard request timeout after ${timeoutMs}ms`, 'TIMEOUT');
    }

    if (debug) console.warn('[RateGuard] network error', error);
    throw createClientError('RateGuard API unreachable', 'NETWORK_ERROR');
  }
}
