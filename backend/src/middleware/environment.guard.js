// src/middleware/environment.guard.js
import { db } from "../db/index.js";

export async function environmentGuard(req, reply) {
  const userId = req.user.userId;

  try {
    // Optional future support
    const headerEnv = req.headers["x-environment-id"];
    if (headerEnv) {
      req.environment = { id: headerEnv };
      return;
    }

    const { rows } = await db.query(
      `
      SELECT id
      FROM environments
      WHERE user_id = $1
        AND is_active = true
      ORDER BY created_at
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      console.error("❌ No active environment for user", userId);
      return reply.code(400).send({
        error: "No active environment found",
      });
    }

    req.environment = { id: rows[0].id };
    console.log("✅ Environment resolved:", rows[0].id);
  } catch (err) {
    console.error("❌ Environment guard failed:", err);
    reply.code(500).send({ error: "Environment resolution failed" });
  }
}
