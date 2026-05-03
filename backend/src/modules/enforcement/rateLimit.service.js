import { logger } from '../../utils/logger.js';
import * as SlidingStrategy from './strategies/slidingWindow.strategy.js';
import { recordRequestMetrics } from '../analytics/analytics.service.js';
import { getRedis } from '../../redis/client.js';
import { hashIdentifier } from '../../utils/hash.js';
import { env } from '../../config/env.js';

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
 * @param {string} [opts.apiKeyId]
 * @param {number} opts.now - epoch seconds
 * @param {Object} [deps] - optional dependencies for testing
 * @param {Object} [deps.strategies]
 * @param {Function} [deps.metricsRecorder]
 * @returns {Promise<RateLimitDecision>}
 */
export async function evaluate({ rules, identifier, endpoint, method, environmentId, apiKeyId, now, smartMode: requestSmartMode }, deps = {}) {
  const strategies = deps.strategies || DEFAULT_STRATEGIES;
  const metricsRecorder = deps.metricsRecorder || recordRequestMetrics;

  const smartMode = deps.smartMode ?? requestSmartMode ?? (env.SMART_MODE === 'true');

  const recordDecision = async (allowed, opts = {}) => {
    await metricsRecorder({
      apiKeyId,
      identifier,
      endpoint,
      method,
      allowed,
      warning: opts.warning,
      violations: opts.violations,
    });
  };

  const startMs = Date.now();
  let totalRedisMs = 0;
  const redis = smartMode ? await getRedis() : null;

  if (!Array.isArray(rules) || rules.length === 0) {
    await recordDecision(true);
    logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
    return { allowed: true, limit: 0, remaining: 0 };
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
    totalRedisMs += Number(result.redisTimeMs || 0);

    // Smart mode: soft warnings and progressive blocking
    if (smartMode) {
      try {
        const usage = (result.count || 0) / (rule.limit_count || 1);
        const hashed = hashIdentifier(identifier);
        const violationsKey = `violations:${rule.id}:${hashed}`;
        const blockKey = `block:${rule.id}:${hashed}`;

        // If there's an active block, respect it
        const blockTtl = await redis.ttl(blockKey).catch(() => -2);
        if (blockTtl && blockTtl > 0) {
          // already blocked
          const violations = Number(await redis.get(violationsKey)) || 1;
          await recordDecision(false, { violations });
          logger.info({ ruleId: rule.id, identifier, violations, retryAfter: blockTtl }, 'rate-limit blocked (active block)');
          logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
          return { allowed: false, ruleId: rule.id, retryAfter: blockTtl, reason: 'rate_limit_exceeded', violations };
        }

        const shouldTrackViolation = usage >= 0.8 || !result.allowed;
        if (shouldTrackViolation) {
          const violations = await redis.incr(violationsKey).catch(() => 1);
          await redis.expire(violationsKey, 300).catch(() => 0);

          let blockSeconds = 0;
          if (violations === 1) {
            await recordDecision(true, { warning: true, violations });
            logger.info({ ruleId: rule.id, identifier, violations, usage }, 'rate-limit warning');
            logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
            return { allowed: true, limit: rule.limit_count, remaining: Math.max(rule.limit_count - result.count, 0), warning: true, message: 'You are nearing your rate limit', violations };
          } else if (violations === 2) {
            blockSeconds = 10;
          } else if (violations === 3) {
            blockSeconds = 60;
          } else {
            blockSeconds = Math.min(300, 60 * (violations - 2));
          }

          await redis.set(blockKey, '1', 'EX', blockSeconds).catch(() => null);

          const retryAfter = blockSeconds;
          await recordDecision(false, { violations });
          logger.info({ ruleId: rule.id, identifier, violations, retryAfter }, 'rate-limit progressive block');
          logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
          return { allowed: false, ruleId: rule.id, limit: rule.limit_count, remaining: 0, retryAfter, reason: 'rate_limit_exceeded', violations };
        }
      } catch (err) {
        // if smart mode helper fails, fall back to default behavior
        logger.warn({ err: err?.message || err }, 'smart mode check failed, falling back');
      }
    }

    logger.debug(
      { ruleId: rule.id, identifier, count: result.count, limit: rule.limit_count, allowed: result.allowed },
      'rate-limit evaluation'
    );

    if (!result.allowed) {
      logger.info({ ruleId: rule.id, identifier, retryAfter: result.retryAfter }, 'rate-limit denied');
      await recordDecision(false);
      logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
      return { allowed: false, ruleId: rule.id, limit: rule.limit_count, remaining: 0, retryAfter: result.retryAfter };
    }
  }

  await recordDecision(true);
  logger.debug({ durationMs: Date.now() - startMs, redisMs: totalRedisMs }, 'rate-limit latency');
  const lastRule = rules[rules.length - 1];
  return { allowed: true, limit: lastRule?.limit_count || 0, remaining: lastRule?.limit_count || 0 };
}
