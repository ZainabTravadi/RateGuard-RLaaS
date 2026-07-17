import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import {
  storePasswordResetOTP,
  verifyPasswordResetOTP,
  markOTPAsUsed,
  updateUserPassword,
  createUser,
} from "./auth.service.js";
import { sendEmail, emailTemplates } from "../../utils/email.js";
import { env } from "../../config/env.js";
import {
  AuthenticationError,
  DatabaseError,
  ValidationError,
} from "../../errors/index.js";

function signToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

export async function signup(req, reply) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError("Email and password are required.", {
      details: { fields: ["email", "password"] },
      documentationURL: "https://rateguard.dev/docs/security",
    });
  }

  try {
    const user = await createUser(email, password);
    const token = signToken(user.id);
    reply.send({ token, user });
  } catch (error) {
    if (error?.code === "23505") {
      throw new ValidationError("A user with that email already exists.", {
        details: { email: email.toLowerCase() },
        documentationURL: "https://rateguard.dev/docs/security",
      });
    }
    throw error;
  }
}

export async function login(req, reply) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError("Email and password are required.", {
      details: { fields: ["email", "password"] },
      documentationURL: "https://rateguard.dev/docs/security",
    });
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
    throw new AuthenticationError("Invalid credentials.", {
      details: { email: email.toLowerCase() },
      documentationURL: "https://rateguard.dev/docs/security",
    });
  }

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) {
    throw new AuthenticationError("Invalid credentials.", {
      details: { email: email.toLowerCase() },
      documentationURL: "https://rateguard.dev/docs/security",
    });
  }

  reply.send({ token: signToken(rows[0].id) });
}

export async function me(req) {
  const userId = req.user.userId;

  const userRes = await db.query(
    `
    SELECT id, email
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (!userRes.rows.length) {
    throw new AuthenticationError("User not found.", {
      details: { userId },
    });
  }

  const envRes = await db.query(
    `
    SELECT id, name, base_url, is_active
    FROM environments
    WHERE user_id = $1
    ORDER BY is_active DESC, created_at ASC
    LIMIT 1
    `,
    [userId]
  );

  return {
    id: userRes.rows[0].id,
    email: userRes.rows[0].email,
    environment: envRes.rows[0] ?? null,
  };
}

export async function forgotPassword(req, reply) {
  const { email } = req.body;
  if (!email) {
    throw new ValidationError("Email is required.", {
      details: { fields: ["email"] },
    });
  }

  const normalizedEmail = email.toLowerCase();

  const { rows } = await db.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
  if (!rows.length) {
    return reply.send({ success: true });
  }

  const { otp } = await storePasswordResetOTP(normalizedEmail);
  const template = emailTemplates.passwordReset(otp);
  await sendEmail(normalizedEmail, template.subject, template.html, template.text);

  reply.send({ success: true, message: "OTP sent to your email" });
}

export async function verifyOTP(req, reply) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ValidationError("Email and OTP are required.", {
      details: { fields: ["email", "otp"] },
    });
  }

  const result = await verifyPasswordResetOTP(email, otp);
  if (!result.valid) {
    throw new ValidationError(result.error || "Invalid OTP.", {
      details: { email },
    });
  }

  reply.send({ success: true, message: "OTP verified successfully", resetId: result.resetId });
}

export async function resetPassword(req, reply) {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    throw new ValidationError("Email, OTP, and password are required.", {
      details: { fields: ["email", "otp", "password"] },
    });
  }

  const result = await verifyPasswordResetOTP(email, otp);
  if (!result.valid) {
    throw new ValidationError(result.error || "Invalid OTP.", {
      details: { email },
    });
  }

  const updateResult = await updateUserPassword(email, password);
  if (!updateResult.success) {
    throw new DatabaseError(updateResult.error || "Failed to update password.", {
      details: { email },
    });
  }

  await markOTPAsUsed(result.resetId);

  const template = emailTemplates.passwordResetSuccess();
  await sendEmail(email, template.subject, template.html, template.text);

  reply.send({
    success: true,
    message: "Password reset successfully",
    token: signToken(updateResult.user.id),
  });
}

