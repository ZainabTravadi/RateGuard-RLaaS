import { logger } from '../../utils/logger.js';
import * as SlidingStrategy from './strategies/slidingWindow.strategy.js';

/**
 * @typedef {Object} RateLimitDecision
 * @property {boolean} allowed
 * @property {number} [retryAfter]
 * @property {string} [ruleId]
 */

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {number} limit_count
 * @property {number} window_seconds
 * @property {string} scope
 * @property {string} [endpoint]
 * @property {string} [method]
 */

/** Default strategy registry. Tests may inject alternate strategies via deps. */
const DEFAULT_STRATEGIES = {
  'sliding-window': SlidingStrategy,
};

/**
 * Evaluate rules using a pluggable strategy. Keeps controller/service/store separation.
 *
 * @param {Object} opts
 * @param {Rule[]} opts.rules
 * @param {string} opts.identifier
 * @param {string} opts.endpoint
 * @param {string} opts.method
 * @param {string} opts.environmentId
 * @param {number} opts.now - epoch seconds
 * @param {Object} [deps] - optional dependencies for testing
 * @param {Object} [deps.strategies]
 * @returns {Promise<RateLimitDecision>}
 */
export async function evaluate({ rules, identifier, endpoint, method, environmentId, now }, deps = {}) {
  const strategies = deps.strategies || DEFAULT_STRATEGIES;

  if (!Array.isArray(rules) || rules.length === 0) {
    return { allowed: true };
  }

  for (const rule of rules) {
    // endpoint-scoped rules only apply to matching endpoints
    if (rule.scope === 'endpoint' && rule.endpoint !== endpoint) {
      continue;
    }

    if (rule.method && rule.method !== method) {
      continue;
    }

    const strategyName = rule.strategy || 'sliding-window';
    const strategy = strategies[strategyName] || strategies['sliding-window'];

    logger.debug({ ruleId: rule.id, identifier, strategy: strategyName }, 'evaluating rate-limit rule');

    const result = await strategy.evaluateRule({ rule, identifier, now }, deps);

    logger.debug(
      { ruleId: rule.id, identifier, count: result.count, limit: rule.limit_count, allowed: result.allowed },
      'rate-limit evaluation'
    );

    if (!result.allowed) {
      logger.info({ ruleId: rule.id, identifier, retryAfter: result.retryAfter }, 'rate-limit denied');
      return { allowed: false, ruleId: rule.id, retryAfter: result.retryAfter };
    }
  }

  return { allowed: true };
}
