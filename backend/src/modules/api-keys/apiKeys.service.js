import crypto from "crypto";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import { DatabaseError, ValidationError } from "../../errors/index.js";

const API_KEY_LENGTH = 32;

function generateApiKey(environment) {
  const prefix = environment === "production" ? "rg_live_" : "rg_test_";
  const random = crypto.randomBytes(API_KEY_LENGTH).toString("hex").slice(0, 32);
  return `${prefix}${random}`;
}

export async function createApiKey(userId, { name, environment }) {
  const rawKey = generateApiKey(environment);
  const hash = await bcrypt.hash(rawKey, 10);

  try {
    const { rows } = await db.query(
      `
      INSERT INTO api_keys (user_id, name, key_hash, key_prefix, environment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, environment, created_at
      `,
      [userId, name, hash, rawKey.slice(0, 8), environment]
    );

    return {
      apiKey: rawKey,
      meta: rows[0],
    };
  } catch (error) {
    throw new DatabaseError("Failed to create API key.", {
      cause: error,
      details: { userId, environment },
    });
  }
}

export async function getApiKeys(userId) {
  const { rows } = await db.query(
    `
    SELECT id, name, key_prefix, environment, is_revoked,
           created_at, last_used_at
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

export async function revokeApiKey(userId, keyId) {
  await db.query(
    `
    UPDATE api_keys
    SET is_revoked = TRUE, updated_at = now()
    WHERE id = $1 AND user_id = $2
    `,
    [keyId, userId]
  );
}

export async function rotateApiKey(userId, keyId) {
  const newKey = generateApiKey("production");
  const hash = await bcrypt.hash(newKey, 10);

  const { rowCount } = await db.query(
    `
    UPDATE api_keys
    SET key_hash = $1,
        key_prefix = $2,
        updated_at = now()
    WHERE id = $3 AND user_id = $4
    `,
    [hash, newKey.slice(0, 8), keyId, userId]
  );

  if (!rowCount) {
    throw new ValidationError("API key not found.", {
      details: { userId, keyId },
    });
  }

  return newKey;
}

