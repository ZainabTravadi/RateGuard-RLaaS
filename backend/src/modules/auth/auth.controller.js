import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import { randomUUID } from "crypto";
import {
  storePasswordResetOTP,
  verifyPasswordResetOTP,
  markOTPAsUsed,
  updateUserPassword,
} from "./auth.service.js";
import { sendEmail, emailTemplates } from "../../utils/email.js";
import { env } from "../../config/env.js";

/* CONFIG */
const API = env.API_URL;

/* ============== SIGNUP ============== */
export async function signup(req, reply) {
  const { email, password } = req.body;

  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password required", code: "MISSING_CREDENTIALS" });
  }

  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  try {
    // 1️⃣ Create user
    await db.query(
      `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      [userId, normalizedEmail, passwordHash]
    );

    // 2️⃣ Create DEFAULT environment for user (CRITICAL)
    await db.query(
      `
      INSERT INTO environments (id, user_id, name, base_url, is_active)
      VALUES ($1, $2, $3, $4, true)
      `,
      [
        randomUUID(),
        userId,
        "production",
        env.DEFAULT_ENV_BASE_URL,
      ]
    );
  } catch (err) {
    if (err.code === "23505") {
      return reply.code(409).send({ error: "User already exists", code: "USER_ALREADY_EXISTS" });
    }
    throw err;
  }

  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  reply.send({ token });
}

/* ============== LOGIN ============== */
export async function login(req, reply) {
  const { email, password } = req.body;

  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password required", code: "MISSING_CREDENTIALS" });
  }

  const { rows } = await db.query(
    `
    SELECT id, password_hash
    FROM users
    WHERE email = $1
    `,
    [email.toLowerCase()]
  );

  if (!rows.length) {
    return reply.code(401).send({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
  }

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
  }

  const token = jwt.sign(
    { userId: rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  reply.send({ token });
}

/* ============== CURRENT USER (/auth/me) ============== */
export async function me(req, reply) {
  const userId = req.user.userId;

  // 🔥 FETCH USER
  const userRes = await db.query(
    `
    SELECT id, email
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (!userRes.rows.length) {
    return reply.code(404).send({ error: "User not found", code: "USER_NOT_FOUND" });
  }

  // 🔥 FETCH ACTIVE ENVIRONMENT
  const envRes = await db.query(
    `
    SELECT id, name, base_url
    FROM environments
    WHERE user_id = $1
    ORDER BY is_active DESC
    LIMIT 1
    `,
    [userId]
  );

  reply.send({
    id: userRes.rows[0].id,
    email: userRes.rows[0].email,
    environment: envRes.rows[0] ?? null,
  });
}

/* ============== FORGOT PASSWORD ============== */
export async function forgotPassword(req, reply) {
  const { email } = req.body;

  if (!email) {
    return reply.code(400).send({ error: "Email is required", code: "MISSING_EMAIL" });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user exists
    const { rows } = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (!rows.length) {
      // For security, don't reveal if email exists
      return reply.send({ success: true });
    }

    // Generate and store OTP
    const { otp, expiresAt } = await storePasswordResetOTP(normalizedEmail);

    // Send OTP via email using template
    const template = emailTemplates.passwordReset(otp);
    await sendEmail(normalizedEmail, template.subject, template.html, template.text);

    reply.send({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return reply.code(500).send({ error: "Failed to process request", code: "INTERNAL_ERROR" });
  }
}

/* ============== VERIFY OTP ============== */
export async function verifyOTP(req, reply) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return reply.code(400).send({ error: "Email and OTP are required", code: "MISSING_OTP" });
  }

  try {
    const result = await verifyPasswordResetOTP(email, otp);

    if (!result.valid) {
      return reply.code(400).send({ error: result.error, code: "INVALID_INPUT" });
    }

    reply.send({
      success: true,
      message: "OTP verified successfully",
      resetId: result.resetId,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return reply.code(500).send({ error: "Failed to verify OTP", code: "INTERNAL_ERROR" });
  }
}

/* ============== RESET PASSWORD ============== */
export async function resetPassword(req, reply) {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return reply.code(400).send({ error: "Email, OTP, and password are required", code: "MISSING_INPUT" });
  }

  try {
    // Verify OTP
    const result = await verifyPasswordResetOTP(email, otp);

    if (!result.valid) {
      return reply.code(400).send({ error: result.error, code: "INVALID_INPUT" });
    }

    // Update password
    const updateResult = await updateUserPassword(email, password);

    if (!updateResult.success) {
      return reply.code(400).send({ error: updateResult.error, code: "INVALID_INPUT" });
    }

    // Mark OTP as used
    await markOTPAsUsed(result.resetId);

    // Send confirmation email using template
    const template = emailTemplates.passwordResetSuccess();
    await sendEmail(email, template.subject, template.html, template.text);

    // Generate new JWT token for automatic login
    const token = jwt.sign(
      { userId: updateResult.user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    reply.send({
      success: true,
      message: "Password reset successfully",
      token,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return reply.code(500).send({ error: "Failed to reset password", code: "INTERNAL_ERROR" });
  }
}
