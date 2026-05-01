import { incrementCounter, getRetryAfter } from '../counter.store.js';

/**
 * Sliding window strategy adapter
 * - wraps store calls into the strategy interface used by RateLimitService
 *
 * @typedef {Object} StrategyResult
 * @property {boolean} allowed
 * @property {number} count
 * @property {number} [retryAfter]
 */

/**
 * Evaluate a single rule using the sliding-window store implementation.
 *
 * @param {Object} opts
 * @param {Object} opts.rule
 * @param {string} opts.identifier
 * @param {number} opts.now - epoch seconds
 * @param {Object} [deps]
 * @returns {Promise<StrategyResult>}
 */
export async function evaluateRule({ rule, identifier, now }, deps = {}) {
  // delegate to counter.store which encapsulates Redis/Lua logic
  const res = await incrementCounter({
    ruleId: rule.id,
    identifier,
    windowSeconds: rule.window_seconds,
    limitCount: rule.limit_count,
    now,
  });

  if (res.allowed) {
    return { allowed: true, count: res.count };
  }

  const retryAfter = await getRetryAfter({
    ruleId: rule.id,
    identifier,
    windowSeconds: rule.window_seconds,
    now,
  });

  return { allowed: false, count: res.count, retryAfter };
}
