import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import { randomUUID } from "crypto";

/* ---------------- SIGN UP ---------------- */
export async function signup(req, reply) {
  const { email, password } = req.body;

  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password required" });
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
        "https://api.yourapp.com",
      ]
    );
  } catch (err) {
    if (err.code === "23505") {
      return reply.code(409).send({ error: "User already exists" });
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

/* ---------------- LOGIN ---------------- */
export async function login(req, reply) {
  const { email, password } = req.body;

  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password required" });
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
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  reply.send({ token });
}

/* ---------------- CURRENT USER (/auth/me) ---------------- */
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
    return reply.code(404).send({ error: "User not found" });
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
