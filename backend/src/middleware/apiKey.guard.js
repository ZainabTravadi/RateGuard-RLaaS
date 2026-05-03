import bcrypt from "bcrypt";
import { db } from "../db/index.js";

export async function apiKeyGuard(req, reply) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    req.log.warn({ path: req.url, ip: req.ip }, "missing api key");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
    return;
  }

  // Basic format validation
  if (!apiKey.startsWith("rg_")) {
    req.log.warn({ path: req.url, ip: req.ip }, "invalid api key format");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
    return;
  }

  // Find candidate keys by prefix
  const prefix = apiKey.slice(0, 8);

  const { rows } = await db.query(
    `
    SELECT id, user_id, key_hash, environment, is_revoked
    FROM api_keys
    WHERE key_prefix = $1
    `,
    [prefix]
  );

  if (rows.length === 0) {
    req.log.warn({ path: req.url, ip: req.ip }, "invalid api key");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
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
    req.log.warn({ path: req.url, ip: req.ip }, "invalid api key");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
    return;
  }

  if (matchedKey.is_revoked) {
    req.log.warn({ apiKeyId: matchedKey.id, path: req.url, ip: req.ip }, "revoked api key");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_API_KEY",
      message: "Invalid or missing API key",
    });
    return;
  }

  // Inject trusted API key context
  req.apiKey = {
    id: matchedKey.id,
    userId: matchedKey.user_id,
    environment: matchedKey.environment,
  };
}
