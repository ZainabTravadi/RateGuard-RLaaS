// src/modules/enforcement/ruleEngine.js
import { incrementCounter } from "./counter.store.js";

/**
 * Evaluate rate-limit rules
 */
export async function evaluateRules({
  rules,
  identifier,
  endpoint,
  method,
  environmentId,
  now,
}) {
  for (const rule of rules) {
    // Endpoint scope
    if (rule.scope === "endpoint" && rule.endpoint !== endpoint) {
      continue;
    }

    // Optional HTTP method filter
    if (rule.method && rule.method !== method) {
      continue;
    }

    const count = incrementCounter({
      ruleId: rule.id,
      identifier,
      windowSeconds: rule.window_seconds,
      now,
    });

    if (count > rule.limit_count) {
      return {
        allowed: false,
        ruleId: rule.id,
        retryAfter: rule.window_seconds,
      };
    }
  }

  return { allowed: true };
}
