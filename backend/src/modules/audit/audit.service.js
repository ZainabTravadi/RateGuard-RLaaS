import { db } from "../../db/index.js";

export async function logApiUsage({
  apiKeyId,
  userId,
  method,
  endpoint,
  statusCode,
  ip,
  ruleId,
}) {
  try {
    await db.query(
      `
      INSERT INTO api_key_logs
        (api_key_id, user_id, method, endpoint, status_code, ip_address, rule_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [apiKeyId, userId, method, endpoint, statusCode, ip, ruleId]
    );
  } catch (err) {
    // Logging must NEVER break requests
    console.error("Audit log failed:", err.message);
  }
}
