import { db } from "../db/index.js";
import { AuthorizationError, DatabaseError, ValidationError } from "../errors/index.js";

export async function environmentGuard(req) {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthorizationError("Authentication required.", {
      documentationURL: "https://rateguard.dev/docs/security",
    });
  }

  const headerEnv = req.headers["x-environment-id"];
  if (headerEnv) {
    req.environment = { id: String(headerEnv) };
    return;
  }

  try {
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
      throw new ValidationError("No active environment found for this account.", {
        details: { userId },
        documentationURL: "https://rateguard.dev/docs/troubleshooting",
      });
    }

    req.environment = { id: rows[0].id };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to resolve environment.", {
      cause: error,
      details: { userId },
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  }
}

