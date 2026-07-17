import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { env } from "../../config/env.js";
import { DatabaseError, ValidationError } from "../../errors/index.js";

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storePasswordResetOTP(email) {
  const normalizedEmail = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.query(`DELETE FROM password_resets WHERE email = $1 AND is_used = false`, [normalizedEmail]);
    await db.query(
      `
      INSERT INTO password_resets (email, otp, expires_at, is_used, created_at)
      VALUES ($1, $2, $3, false, now())
      `,
      [normalizedEmail, otp, expiresAt]
    );
    return { otp, expiresAt };
  } catch (error) {
    throw new DatabaseError("Failed to store password reset OTP.", {
      cause: error,
      details: { email: normalizedEmail },
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  }
}

export async function verifyPasswordResetOTP(email, otp) {
  const normalizedEmail = email.toLowerCase();
  const { rows } = await db.query(
    `
    SELECT id, otp, expires_at, is_used
    FROM password_resets
    WHERE email = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [normalizedEmail]
  );

  if (!rows.length) {
    return { valid: false, error: "No password reset request found" };
  }

  const resetRecord = rows[0];

  if (resetRecord.is_used) {
    return { valid: false, error: "This OTP has already been used" };
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    return { valid: false, error: "OTP has expired" };
  }

  if (resetRecord.otp !== otp) {
    return { valid: false, error: "Invalid OTP" };
  }

  return { valid: true, resetId: resetRecord.id };
}

export async function markOTPAsUsed(resetId) {
  await db.query(`UPDATE password_resets SET is_used = true WHERE id = $1`, [resetId]);
}

export async function updateUserPassword(email, newPassword) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { rows } = await db.query(
    `
    UPDATE users
    SET password_hash = $1, updated_at = now()
    WHERE email = $2
    RETURNING id, email
    `,
    [passwordHash, normalizedEmail]
  );

  if (!rows.length) {
    return { success: false, error: "User not found" };
  }

  return { success: true, user: rows[0] };
}

export async function createUser(email, password) {
  const client = await db.connect();
  const normalizedEmail = email.toLowerCase();

  try {
    await client.query("BEGIN");

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const workspaceId = randomUUID();
    const teamId = randomUUID();

    await client.query(
      `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      [userId, normalizedEmail, passwordHash]
    );

    await client.query(
      `
      INSERT INTO workspaces (id, owner_id, name)
      VALUES ($1, $2, $3)
      `,
      [workspaceId, userId, `${normalizedEmail.split("@")[0]}'s Workspace`]
    );

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [workspaceId, userId]
    );

    await client.query(
      `
      INSERT INTO teams (id, owner_id, name)
      VALUES ($1, $2, $3)
      `,
      [teamId, userId, `${normalizedEmail.split("@")[0]}'s Team`]
    );

    await client.query(
      `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [teamId, userId]
    );

    await client.query(
      `
      INSERT INTO environments (user_id, name, base_url, is_active)
      VALUES
        ($1, 'production', $2, true),
        ($1, 'development', $3, true)
      `,
      [userId, env.DEFAULT_ENV_BASE_URL, env.DEFAULT_DEV_ENV_BASE_URL]
    );

    await client.query("COMMIT");

    return { id: userId, email: normalizedEmail };
  } catch (error) {
    await client.query("ROLLBACK");
    throw new DatabaseError("Failed to create user.", {
      cause: error,
      details: { email: normalizedEmail },
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  } finally {
    client.release();
  }
}

export async function createDefaultEnvironment(userId) {
  const { rows } = await db.query(
    `
    INSERT INTO environments (id, user_id, name, base_url, is_active)
    VALUES ($1, $2, 'production', '', true)
    RETURNING *
    `,
    [randomUUID(), userId]
  );

  if (!rows.length) {
    throw new ValidationError("Failed to create default environment.", {
      details: { userId },
      documentationURL: "https://rateguard.dev/docs/errors",
    });
  }

  return rows[0];
}

