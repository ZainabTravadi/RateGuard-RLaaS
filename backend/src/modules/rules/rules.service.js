import { db } from "../../db/index.js";
import { randomUUID } from "crypto";

// Simple in-memory cache for rules to avoid DB hits for every request
const RULE_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const ruleCache = new Map(); // key -> { expiresAt, rows }

function cacheKey(userId, environmentId) {
  return `${userId}:${environmentId}`;
}

function getCachedRules(userId, environmentId) {
  const key = cacheKey(userId, environmentId);
  const entry = ruleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ruleCache.delete(key);
    return null;
  }
  return entry.rows;
}

function setCachedRules(userId, environmentId, rows) {
  const key = cacheKey(userId, environmentId);
  ruleCache.set(key, { expiresAt: Date.now() + RULE_CACHE_TTL_MS, rows });
}

function invalidateRuleCache(userId, environmentId) {
  const key = cacheKey(userId, environmentId);
  ruleCache.delete(key);
}

/**
 * READ — user scoped rules
 */
export async function getRulesByUser(userId, environmentId) {
  const cached = getCachedRules(userId, environmentId);
  if (cached) return cached;

  const { rows } = await db.query(
    `
    SELECT *
    FROM rate_limit_rules
    WHERE user_id = $1
      AND environment_id = $2
    ORDER BY priority ASC
    `,
    [userId, environmentId]
  );

  setCachedRules(userId, environmentId, rows);
    return rows;
}

/**
 * CREATE
 */
export async function createRule({
  userId,
  environmentId,
  name,
  description,
  scope,
  endpoint,
  limit,
  windowSeconds,
  enabled = true,
}) {
  const { rows } = await db.query(
    `
    INSERT INTO rate_limit_rules (
      id,
      user_id,
      environment_id,
      name,
      description,
      limit_count,
      window_seconds,
      scope,
      endpoint,
      enabled,
      priority
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
    `,
    [
      randomUUID(),
      userId,
      environmentId,
      name,
      description ?? "",
      limit,
      windowSeconds,
      scope,
      endpoint,
      enabled,
      100
    ]
  );

    const res = rows[0];
    // invalidate cache for this user's environment
    invalidateRuleCache(res.user_id, res.environment_id);
    return res;
}

// Ensure cache invalidation on modifications
export async function createRuleAndInvalidate(payload) {
  const r = await createRule(payload);
  invalidateRuleCache(payload.userId, payload.environmentId);
  return r;
}

/**
 * TOGGLE enabled
 */
export async function toggleRule(ruleId, userId) {
  const { rows } = await db.query(
    `
    UPDATE rate_limit_rules
    SET enabled = NOT enabled
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [ruleId, userId]
  );

    const res = rows[0];
    if (res) invalidateRuleCache(res.user_id, res.environment_id);
    return res;
}

export async function toggleRuleAndInvalidate(ruleId, userId) {
  const res = await toggleRule(ruleId, userId);
  if (res) {
    invalidateRuleCache(res.user_id, res.environment_id);
  }
  return res;
}

/**
 * DELETE
 */
export async function deleteRule(ruleId, userId, environmentId) {
  const result = await db.query(
    `
    DELETE FROM rate_limit_rules
    WHERE id = $1 AND user_id = $2 AND environment_id = $3
    `,
    [ruleId, userId, environmentId]
  );

    const count = result.rowCount;
    if (count) invalidateRuleCache(userId, environmentId);
    return count;
}

export async function deleteRuleAndInvalidate(ruleId, userId, environmentId) {
  const count = await deleteRule(ruleId, userId, environmentId);
  invalidateRuleCache(userId, environmentId);
  return count;
}

/**
 * UPDATE — limit / window / scope / endpoint
 */
export async function updateRule(ruleId, userId, environmentId, updates) {
  const { rows } = await db.query(
    `
    UPDATE rate_limit_rules
    SET
      limit_count = $1,
      window_seconds = $2,
      scope = $3,
      endpoint = $4
    WHERE id = $5
      AND user_id = $6
      AND environment_id = $7
    RETURNING *
    `,
    [
      updates.limit,
      updates.windowSeconds,
      updates.scope,
      updates.endpoint ?? null, // 🔥 THIS WAS MISSING
      ruleId,
      userId,
      environmentId
    ]
  );

    const res = rows[0];
    if (res) invalidateRuleCache(userId, environmentId);
    return res;
}

export async function updateRuleAndInvalidate(ruleId, userId, environmentId, updates) {
  const r = await updateRule(ruleId, userId, environmentId, updates);
  invalidateRuleCache(userId, environmentId);
  return r;
}
