import { db } from "../../db/index.js";
import { randomUUID } from "crypto";

/**
 * READ — user scoped rules
 */
export async function getRulesByUser(userId, environmentId) {
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

  return rows[0];
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

  return rows[0];
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

  return result.rowCount;
}
