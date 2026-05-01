// src/modules/enforcement/ruleEngine.js
import { evaluate as evaluateRateLimit } from './rateLimit.service.js';

/**
 * Thin compatibility wrapper kept for backwards compatibility.
 * Delegates to the new RateLimitService.
 */
export async function evaluateRules(opts) {
  return evaluateRateLimit(opts);
}
