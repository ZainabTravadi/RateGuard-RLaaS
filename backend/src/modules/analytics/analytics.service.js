import { db } from "../../db/index.js";
import { getRedis } from "../../redis/client.js";

const GLOBAL_REQUESTS_KEY = "metrics:global:requests";
const GLOBAL_ALLOWED_KEY = "metrics:global:allowed";
const GLOBAL_BLOCKED_KEY = "metrics:global:blocked";
const GLOBAL_METHOD_PREFIX = "metrics:method:";
const ENDPOINT_PREFIX = "metrics:endpoint:";
const API_KEY_PREFIX = "metrics:apikey:";
const IDENTIFIER_PREFIX = "metrics:identifier:";
const HOURLY_PREFIX = "metrics:hour:";
const DAILY_PREFIX = "metrics:day:";

function encodeMetricSegment(value) {
  return encodeURIComponent(String(value ?? "unknown"));
}

function decodeMetricSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeMethod(method) {
  return String(method || "UNKNOWN").toUpperCase();
}

function formatHourBucket(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}`;
}

function formatDayBucket(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function readCounter(redis, key) {
  const value = await redis.get(key);
  return Number(value || 0);
}

async function scanKeys(redis, pattern) {
  if (typeof redis.scan !== "function") {
    if (typeof redis.keys === "function") {
      return redis.keys(pattern);
    }

    return [];
  }

  const keys = [];
  let cursor = "0";

  do {
    const [nextCursor, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");

  return keys;
}

async function readRankedCounters(redis, pattern, prefix, extraSuffixes = []) {
  const requestKeys = await scanKeys(redis, pattern);

  const rows = await Promise.all(
    requestKeys.map(async (requestKey) => {
      const encodedValue = requestKey.slice(prefix.length, -":requests".length);
      const blockedKey = `${requestKey.slice(0, -":requests".length)}:blocked`;
      const extraKeys = extraSuffixes.map((suffix) => `${requestKey.slice(0, -":requests".length)}:${suffix}`);

      const [requests, blocked, ...extraValues] = await Promise.all([
        readCounter(redis, requestKey),
        readCounter(redis, blockedKey),
        ...extraKeys.map((key) => readCounter(redis, key)),
      ]);

      const extraStats = extraSuffixes.reduce((acc, suffix, index) => {
        acc[suffix] = extraValues[index] || 0;
        return acc;
      }, {});

      return {
        key: decodeMetricSegment(encodedValue),
        requests,
        blocked,
        blockRate: requests > 0 ? Number(((blocked / requests) * 100).toFixed(2)) : 0,
        ...extraStats,
      };
    })
  );

  return rows.sort((left, right) => right.requests - left.requests || left.key.localeCompare(right.key));
}

async function incrementMetrics(redis, keys) {
  if (!keys.length) {
    return;
  }

  if (typeof redis.pipeline === "function") {
    const pipeline = redis.pipeline();

    for (const key of keys) {
      pipeline.incr(key);
    }

    await pipeline.exec();
    return;
  }

  await Promise.all(keys.map((key) => redis.incr(key)));
}

export async function recordRequestMetrics({ apiKeyId, identifier, endpoint, method, allowed, warning, violations }) {
  try {
    const redis = await getRedis();
    const normalizedMethod = normalizeMethod(method);
    const endpointSegment = encodeMetricSegment(endpoint);
    const identifierSegment = encodeMetricSegment(identifier);
    const hourBucket = formatHourBucket();
    const dayBucket = formatDayBucket();
    const keys = [
      GLOBAL_REQUESTS_KEY,
      allowed ? GLOBAL_ALLOWED_KEY : GLOBAL_BLOCKED_KEY,
      `${GLOBAL_METHOD_PREFIX}${normalizedMethod}:requests`,
      `${ENDPOINT_PREFIX}${endpointSegment}:requests`,
      `${IDENTIFIER_PREFIX}${identifierSegment}:requests`,
      `${HOURLY_PREFIX}${hourBucket}:requests`,
      `${DAILY_PREFIX}${dayBucket}:requests`,
    ];

    if (!allowed) {
      keys.push(
        `${GLOBAL_METHOD_PREFIX}${normalizedMethod}:blocked`,
        `${ENDPOINT_PREFIX}${endpointSegment}:blocked`,
        `${IDENTIFIER_PREFIX}${identifierSegment}:blocked`,
        `${HOURLY_PREFIX}${hourBucket}:blocked`,
        `${DAILY_PREFIX}${dayBucket}:blocked`,
      );
    }

    if (apiKeyId) {
      const apiKeySegment = encodeMetricSegment(apiKeyId);
      keys.push(`${API_KEY_PREFIX}${apiKeySegment}:requests`);

      if (!allowed) {
        keys.push(`${API_KEY_PREFIX}${apiKeySegment}:blocked`);
      }
    }

    // track warnings and violations if present
    if (warning) {
      keys.push(`metrics:warnings`);
      keys.push(`${ENDPOINT_PREFIX}${endpointSegment}:warnings`);
      keys.push(`${IDENTIFIER_PREFIX}${identifierSegment}:warnings`);
      if (apiKeyId) keys.push(`${API_KEY_PREFIX}${encodeMetricSegment(apiKeyId)}:warnings`);
    }

    if (typeof violations === 'number' && violations > 0) {
      keys.push(`metrics:violations`);
      keys.push(`${ENDPOINT_PREFIX}${endpointSegment}:violations`);
      keys.push(`${IDENTIFIER_PREFIX}${identifierSegment}:violations`);
      if (apiKeyId) keys.push(`${API_KEY_PREFIX}${encodeMetricSegment(apiKeyId)}:violations`);
    }

    await incrementMetrics(redis, keys);
  } catch (err) {
    console.warn("analytics metrics write failed:", err?.message || err);
  }
}

export async function getGlobalStats() {
  const redis = await getRedis();
  const [totalRequests, allowedRequests, blockedRequests, warningsIssued, repeatedViolations, topEndpoints, requestsByMethod] = await Promise.all([
    readCounter(redis, GLOBAL_REQUESTS_KEY),
    readCounter(redis, GLOBAL_ALLOWED_KEY),
    readCounter(redis, GLOBAL_BLOCKED_KEY),
    readCounter(redis, 'metrics:warnings'),
    readCounter(redis, 'metrics:violations'),
    getEndpointStats({ limit: 5 }),
    getMethodStats(redis),
  ]);

  return {
    totalRequests,
    allowedRequests,
    blockedRequests,
    warningsIssued,
    repeatedViolations,
    blockRate: totalRequests > 0 ? Number(((blockedRequests / totalRequests) * 100).toFixed(2)) : 0,
    topEndpoints,
    requestsByMethod,
    recentHours: await getTimeBucketStats({ granularity: "hour", limit: 24 }),
    recentDays: await getTimeBucketStats({ granularity: "day", limit: 7 }),
  };
}

export async function getTimeBucketStats({ granularity = "hour", limit = 24 } = {}) {
  const prefix = granularity === "day" ? DAILY_PREFIX : HOURLY_PREFIX;
  const redis = await getRedis();
  const rows = await readRankedCounters(redis, `${prefix}*:requests`, prefix);
  return rows.slice(0, limit);
}

export async function getEndpointStats({ limit = 10 } = {}) {
  const redis = await getRedis();
  const rows = await readRankedCounters(redis, `${ENDPOINT_PREFIX}*:requests`, ENDPOINT_PREFIX, ["warnings", "violations"]);
  return rows.slice(0, limit);
}

export async function getApiKeyStats({ limit = 10 } = {}) {
  const redis = await getRedis();
  const rows = await readRankedCounters(redis, `${API_KEY_PREFIX}*:requests`, API_KEY_PREFIX, ["warnings", "violations"]);
  return rows.slice(0, limit);
}

async function getMethodStats(redis) {
  return readRankedCounters(redis, `${GLOBAL_METHOD_PREFIX}*:requests`, GLOBAL_METHOD_PREFIX);
}

export async function getTimeSeriesAnalytics(userId, interval) {
  const bucket =
    interval === "1h" ? "minute" :
    interval === "24h" ? "hour" :
    interval === "7d" ? "day" :
    "day";

  const { rows } = await db.query(
    `
    SELECT
      date_trunc($2, created_at) AS time,
      COUNT(*) AS rps,
      COUNT(*) FILTER (WHERE status_code != 429) AS allowed,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY time
    ORDER BY time
    `,
    [userId, bucket]
  );

  return rows;
}

export async function getAllowedVsBlocked(userId) {
  const { rows } = await db.query(
    `
    SELECT
      to_char(created_at, 'Dy') AS name,
      COUNT(*) FILTER (WHERE status_code != 429) AS allowed,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY name
    ORDER BY MIN(created_at)
    `,
    [userId]
  );

  return rows;
}

export async function getTopEndpoints(userId) {
  const { rows } = await db.query(
    `
    SELECT
      endpoint,
      COUNT(*) AS requests,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
    GROUP BY endpoint
    ORDER BY requests DESC
    LIMIT 10
    `,
    [userId]
  );

  return rows.map(r => ({
    ...r,
    percentage: Math.round((r.requests / rows[0].requests) * 100)
  }));
}
