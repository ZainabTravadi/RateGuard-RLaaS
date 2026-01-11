import { db } from "../../db/index.js";

export async function getEnvironments(userId) {
  const { rows } = await db.query(
    `
    SELECT id, name, base_url, is_active, created_at
    FROM environments
    WHERE user_id = $1
    ORDER BY name
    `,
    [userId]
  );

  return rows;
}

export async function updateEnvironment(userId, envId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (updates.base_url !== undefined) {
    fields.push(`base_url = $${idx++}`);
    values.push(updates.base_url);
  }

  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(updates.is_active);
  }

  if (!fields.length) return;

  values.push(envId, userId);

  await db.query(
    `
    UPDATE environments
    SET ${fields.join(", ")}
    WHERE id = $${idx++}
      AND user_id = $${idx}
    `,
    values
  );
}
