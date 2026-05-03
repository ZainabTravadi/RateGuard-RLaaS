import { getRedis } from "../../redis/client.js";
import { logger } from "../../utils/logger.js";
import { hashIdentifier } from "../../utils/hash.js";
import { env } from "../../config/env.js";

const fallbackCounters = new Map();
const deniedRetryAfterCache = new Map();
let fallbackWarningLogged = false;
const REDIS_TIMEOUT_MS = Number(env.REDIS_TIMEOUT_MS || 250);
const FAIL_OPEN = env.RATE_LIMIT_FAIL_OPEN;

function withTimeout(promise, label) {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out`);
      error.code = "REDIS_TIMEOUT";
      reject(error);
    }, REDIS_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Single atomic Lua script that performs sliding-window cleanup, count,
// conditional add, expiry enforcement, and computes retryAfter when denied.
const SLIDING_WINDOW_INCREMENT_SCRIPT = `
  local key = KEYS[1]
  local sequenceKey = KEYS[2]
  local nowMs = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local limitCount = tonumber(ARGV[3])
  local ttlSeconds = tonumber(ARGV[4])

  -- remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, 0, nowMs - windowMs)
  local currentCount = redis.call('ZCARD', key)

  if currentCount < limitCount then
    -- allow: add a unique member and ensure TTL on both keys
    local seq = redis.call('INCR', sequenceKey)
    local member = tostring(nowMs) .. ':' .. tostring(seq)
    redis.call('ZADD', key, nowMs, member)
    redis.call('EXPIRE', key, ttlSeconds)
    redis.call('EXPIRE', sequenceKey, ttlSeconds)
    return {1, tostring(currentCount + 1), '0'}
  else
    -- denied: fetch earliest timestamp and compute retryAfter (seconds)
    local earliestEntry = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local earliest = -1
    if earliestEntry and #earliestEntry > 0 then
      earliest = tonumber(earliestEntry[2])
    end

    if earliest < 0 then
      return {0, tostring(currentCount), tostring(math.ceil(windowMs / 1000))}
    end

    local retryAfterSec = math.ceil((earliest + windowMs - nowMs) / 1000)
    if retryAfterSec < 0 then retryAfterSec = 0 end
    return {0, tostring(currentCount), tostring(retryAfterSec)}
  end
`;

const SLIDING_WINDOW_EARLIEST_SCRIPT = `
  local key = KEYS[1]
  local nowMs = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])

  redis.call('ZREMRANGEBYSCORE', key, 0, nowMs - windowMs)
  local earliestEntry = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')

  if not earliestEntry or #earliestEntry == 0 then
    return -1
  end

  return tonumber(earliestEntry[2])
`;

// Cached SHA of the loaded script (populated at runtime)
let SLIDING_WINDOW_INCREMENT_SHA = null;

async function ensureIncrementScriptLoaded(redis) {
  if (SLIDING_WINDOW_INCREMENT_SHA) return SLIDING_WINDOW_INCREMENT_SHA;

  try {
    // use SCRIPT LOAD to avoid sending the whole script every time
    const sha = await redis.script('load', SLIDING_WINDOW_INCREMENT_SCRIPT);
    SLIDING_WINDOW_INCREMENT_SHA = sha;
    return sha;
  } catch (err) {
    // if SCRIPT LOAD isn't supported by the client (mock), ignore and fall back to EVAL
    logger.debug({ err: err?.message || err }, 'Unable to SCRIPT LOAD Lua script, will fall back to EVAL');
    return null;
  }
}

function logFallbackWarning(err) {
  if (fallbackWarningLogged) return;

  logger.warn(
    { error: err?.message || err },
    "Redis rate-limit counter unavailable, using in-memory fallback"
  );
  fallbackWarningLogged = true;
}

function getFallbackBucket(key, windowMs, nowMs) {
  const windowStart = nowMs - windowMs;
  const timestamps = fallbackCounters.get(key) || [];
  const filtered = timestamps
    .filter((timestamp) => timestamp > windowStart)
    .sort((left, right) => left - right);
  fallbackCounters.set(key, filtered);
  return filtered;
}

function buildFallbackResult(key, windowSeconds, limitCount, now) {
  const nowMs = now * 1000;
  const windowMs = windowSeconds * 1000;
  const bucket = getFallbackBucket(key, windowMs, nowMs);

  if (bucket.length < limitCount) {
    bucket.push(nowMs);
    bucket.sort((left, right) => left - right);
    fallbackCounters.set(key, bucket);
    return { count: bucket.length, allowed: true, earliest: -1 };
  }

  const earliest = bucket[0] ?? -1;
  return { count: bucket.length, allowed: false, earliest };
}

function cacheDeniedRetryAfter(key, retryAfterSeconds) {
  deniedRetryAfterCache.set(key, retryAfterSeconds);
}

function consumeCachedRetryAfter(key) {
  if (!deniedRetryAfterCache.has(key)) {
    return null;
  }

  const retryAfter = deniedRetryAfterCache.get(key);
  deniedRetryAfterCache.delete(key);
  return retryAfter;
}

function calculateRetryAfterFromEarliest(earliestMs, windowSeconds, now) {
  if (typeof earliestMs !== "number" || earliestMs < 0) {
    return windowSeconds;
  }

  const retryAfter = Math.ceil(((earliestMs + windowSeconds * 1000) - now * 1000) / 1000);
  return retryAfter > 0 ? retryAfter : windowSeconds;
}

/**
 * Increment counter for a rule + identifier within a sliding window.
 */
export async function incrementCounter({ ruleId, identifier, windowSeconds, limitCount, now }) {
  const hashed = hashIdentifier(identifier);
  const key = `rate:${ruleId}:${hashed}`;
  const sequenceKey = `${key}:seq`;
  const nowMs = now * 1000;
  const windowMs = windowSeconds * 1000;

  try {
    const redis = await getRedis();
    const sha = await withTimeout(ensureIncrementScriptLoaded(redis), "redis script load");

    let rawRes;

    if (sha && typeof redis.evalsha === 'function') {
      try {
        rawRes = await withTimeout(
          redis.evalsha(
            sha,
            2,
            key,
            sequenceKey,
            String(nowMs),
            String(windowMs),
            String(limitCount),
            String(windowSeconds)
          ),
          "redis evalsha"
        );
      } catch (err) {
        // NOSCRIPT -> reload once and fallback to EVAL
        if (String(err?.message || '').toLowerCase().includes('noscript')) {
          SLIDING_WINDOW_INCREMENT_SHA = null;
          const newSha = await ensureIncrementScriptLoaded(redis);
          if (newSha && newSha !== sha) {
            rawRes = await withTimeout(
              redis.evalsha(
                newSha,
                2,
                key,
                sequenceKey,
                String(nowMs),
                String(windowMs),
                String(limitCount),
                String(windowSeconds)
              ),
              "redis evalsha"
            );
          } else {
            rawRes = await withTimeout(
              redis.eval(
                SLIDING_WINDOW_INCREMENT_SCRIPT,
                2,
                key,
                sequenceKey,
                String(nowMs),
                String(windowMs),
                String(limitCount),
                String(windowSeconds)
              ),
              "redis eval"
            );
          }
        } else {
          throw err;
        }
      }
    } else {
      rawRes = await withTimeout(
        redis.eval(
          SLIDING_WINDOW_INCREMENT_SCRIPT,
          2,
          key,
          sequenceKey,
          String(nowMs),
          String(windowMs),
          String(limitCount),
          String(windowSeconds)
        ),
        "redis eval"
      );
    }

    const t0 = Date.now();
    const [rawAllowed, rawCount, rawRetryAfter] = rawRes;
    const redisTimeMs = Date.now() - t0;

    const allowed = Number(rawAllowed) === 1;
    const count = Number(rawCount);
    const retryAfter = Number(rawRetryAfter);

    if (!allowed) {
      cacheDeniedRetryAfter(key, retryAfter);
    }

    return { count, allowed, earliest: -1, redisTimeMs };
  } catch (err) {
    logFallbackWarning(err);

    if (!FAIL_OPEN) {
      return { count: limitCount, allowed: false, earliest: -1 };
    }

    const result = buildFallbackResult(key, windowSeconds, limitCount, now);

    if (!result.allowed) {
      const retryAfter = calculateRetryAfterFromEarliest(result.earliest, windowSeconds, now);
      cacheDeniedRetryAfter(key, retryAfter);
    }

    return { ...result, redisTimeMs: 0 };
  }
}

export async function getRetryAfter({ ruleId, identifier, windowSeconds, now }) {
  const hashed = hashIdentifier(identifier);
  const key = `rate:${ruleId}:${hashed}`;

  const cachedRetryAfter = consumeCachedRetryAfter(key);
  if (cachedRetryAfter !== null) {
    return { retryAfter: cachedRetryAfter, redisTimeMs: 0 };
  }

  try {
    const redis = await getRedis();
    const t0 = Date.now();
    const earliestMs = await withTimeout(
      redis.eval(
        SLIDING_WINDOW_EARLIEST_SCRIPT,
        1,
        key,
        String(now * 1000),
        String(windowSeconds * 1000)
      ),
      "redis eval"
    );
    const redisTimeMs = Date.now() - t0;

    const retryAfter = calculateRetryAfterFromEarliest(Number(earliestMs), windowSeconds, now);
    if (retryAfter !== windowSeconds) {
      return { retryAfter, redisTimeMs };
    }

    return { retryAfter: windowSeconds, redisTimeMs };
  } catch (err) {
    logFallbackWarning(err);

    if (!FAIL_OPEN) {
      return windowSeconds;
    }

    const bucket = getFallbackBucket(key, windowSeconds * 1000, now * 1000);
    if (!bucket.length) {
      return { retryAfter: windowSeconds, redisTimeMs: 0 };
    }

    return { retryAfter: calculateRetryAfterFromEarliest(bucket[0], windowSeconds, now), redisTimeMs: 0 };
  }
}