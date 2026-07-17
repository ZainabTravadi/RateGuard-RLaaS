import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db/index.js";
import { AuthenticationError, DatabaseError } from "../errors/index.js";

function safeEquals(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function unauthorized(request) {
  request.log.warn({ path: request.url, ip: request.ip }, "invalid api key");
  throw new AuthenticationError("Invalid or missing API key.", {
    details: { header: "x-api-key" },
    documentationURL: "https://rateguard.dev/docs/security",
  });
}

export async function apiKeyGuard(req) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    unauthorized(req);
  }

  if (!apiKey.startsWith("rg_")) {
    unauthorized(req);
  }

  const prefix = apiKey.slice(0, 8);

  let rows;
  try {
    const result = await db.query(
      `
      SELECT id, user_id, key_hash, environment, is_revoked
      FROM api_keys
      WHERE key_prefix = $1
      `,
      [prefix]
    );
    rows = result.rows;
  } catch (error) {
    throw new DatabaseError("Failed to load API key records.", {
      cause: error,
      details: { prefix },
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  }

  if (rows.length === 0) {
    unauthorized(req);
  }

  let matchedKey = null;
  for (const row of rows) {
    const candidate = await bcrypt.compare(apiKey, row.key_hash);
    if (candidate && safeEquals(prefix, row.key_prefix)) {
      matchedKey = row;
      break;
    }
  }

  if (!matchedKey || matchedKey.is_revoked) {
    unauthorized(req);
  }

  await db.query(
    `UPDATE api_keys SET last_used_at = now(), updated_at = now() WHERE id = $1`,
    [matchedKey.id]
  ).catch((error) => {
    throw new DatabaseError("Failed to update API key usage metadata.", {
      cause: error,
      details: { apiKeyId: matchedKey.id },
    });
  });

  req.apiKey = {
    id: matchedKey.id,
    userId: matchedKey.user_id,
    environment: matchedKey.environment,
  };
}

