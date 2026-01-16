import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../db/index.js";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate a 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP for password reset
 */
export async function storePasswordResetOTP(email) {
  const normalizedEmail = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  try {
    // Delete any existing unused OTPs for this email
    await db.query(
      `DELETE FROM password_resets WHERE email = $1 AND is_used = false`,
      [normalizedEmail]
    );

    // Insert new OTP
    await db.query(
      `
      INSERT INTO password_resets (email, otp, expires_at, is_used, created_at)
      VALUES ($1, $2, $3, false, NOW())
      `,
      [normalizedEmail, otp, expiresAt]
    );

    return { otp, expiresAt };
  } catch (err) {
    console.error("Error storing OTP:", err);
    throw err;
  }
}

/**
 * Verify OTP for password reset
 */
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

  // Check if already used
  if (resetRecord.is_used) {
    return { valid: false, error: "This OTP has already been used" };
  }

  // Check if expired
  if (new Date() > new Date(resetRecord.expires_at)) {
    return { valid: false, error: "OTP has expired" };
  }

  // Check if OTP matches
  if (resetRecord.otp !== otp) {
    return { valid: false, error: "Invalid OTP" };
  }

  return { valid: true, resetId: resetRecord.id };
}

/**
 * Mark OTP as used
 */
export async function markOTPAsUsed(resetId) {
  await db.query(
    `UPDATE password_resets SET is_used = true WHERE id = $1`,
    [resetId]
  );
}

/**
 * Update user password
 */
export async function updateUserPassword(email, newPassword) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { rows } = await db.query(
    `
    UPDATE users
    SET password_hash = $1
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

  try {
    await client.query("BEGIN");

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // 1️⃣ Create User
    await client.query(
      `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      [userId, email.toLowerCase(), passwordHash]
    );

    // 2️⃣ Create Workspace
    const workspaceRes = await client.query(
      `
      INSERT INTO workspaces (owner_id, name)
      VALUES ($1, $2)
      RETURNING id
      `,
      [userId, `${email.split("@")[0]}'s Workspace`]
    );

    const workspaceId = workspaceRes.rows[0].id;

    // 3️⃣ Add owner as admin member
    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [workspaceId, userId]
    );

    // 4️⃣ Create legacy team tables (for backward compatibility)
    const teamRes = await client.query(
      `
      INSERT INTO teams (owner_id, name)
      VALUES ($1, $2)
      RETURNING id
      `,
      [userId, `${email.split("@")[0]}'s Team`]
    );

    const teamId = teamRes.rows[0].id;

    await client.query(
      `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [teamId, userId]
    );

    // 5️⃣ Create default environments
    await client.query(
      `
      INSERT INTO environments (user_id, name, base_url, is_active)
      VALUES
        ($1, 'production', 'https://api.rateguard.io', true),
        ($1, 'development', 'https://dev.api.rateguard.io', true)
      `,
      [userId]
    );

    await client.query("COMMIT");

    return { id: userId, email };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SIGNUP FAILED:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function createDefaultEnvironment(userId) {
  const { rows } = await db.query(
    `
    INSERT INTO environments (
      id,
      user_id,
      name,
      base_url,
      is_active
    )
    VALUES ($1, $2, 'production', '', true)
    RETURNING *
    `,
    [randomUUID(), userId]
  );

  return rows[0];
}
