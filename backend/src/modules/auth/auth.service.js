import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../db/index.js";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

export async function createUser(email, password) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // 1️⃣ User
    await client.query(
      `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      [userId, email.toLowerCase(), passwordHash]
    );

    // 2️⃣ Team
    const teamRes = await client.query(
      `
      INSERT INTO teams (owner_id, name)
      VALUES ($1, $2)
      RETURNING id
      `,
      [userId, `${email.split("@")[0]}'s Team`]
    );

    const teamId = teamRes.rows[0].id;

    // 3️⃣ Team member (admin)
    await client.query(
      `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [teamId, userId]
    );

    // 4️⃣ Environments (🔥 YOU MISSED THIS EARLIER)
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
