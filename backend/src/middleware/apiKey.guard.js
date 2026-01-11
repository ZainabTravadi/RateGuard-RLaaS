import bcrypt from "bcrypt";
import { db } from "../db/index.js";

export async function apiKeyGuard(req, reply) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    reply.code(401).send({ error: "API key missing" });
    return;
  }

  // Basic format validation
  if (!apiKey.startsWith("rg_")) {
    reply.code(401).send({ error: "Invalid API key format" });
    return;
  }

  // Find candidate keys by prefix
  const prefix = apiKey.slice(0, 8);

  const { rows } = await db.query(
    `
    SELECT id, user_id, key_hash, environment, is_revoked
    FROM api_keys
    WHERE key_prefix = $1
      AND is_revoked = FALSE
    `,
    [prefix]
  );

  if (rows.length === 0) {
    reply.code(401).send({ error: "Invalid API key" });
    return;
  }

  // Compare hash
  let matchedKey = null;

  for (const row of rows) {
    const isMatch = await bcrypt.compare(apiKey, row.key_hash);
    if (isMatch) {
      matchedKey = row;
      break;
    }
  }

  if (!matchedKey) {
    reply.code(401).send({ error: "Invalid API key" });
    return;
  }

  // Inject trusted API key context
  req.apiKey = {
    id: matchedKey.id,
    userId: matchedKey.user_id,
    environment: matchedKey.environment,
  };
}
