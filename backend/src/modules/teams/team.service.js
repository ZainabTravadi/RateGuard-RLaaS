import { db } from "../../db/index.js";

/* ===================== GET TEAM MEMBERS ===================== */

export async function getTeamMembers(ownerId) {
  const { rows } = await db.query(
    `
    SELECT
      tm.id,
      split_part(u.email, '@', 1) AS name,
      u.email,
      tm.role
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN users u ON u.id = tm.user_id
    WHERE t.owner_id = $1
    ORDER BY tm.created_at
    `,
    [ownerId]
  );

  return rows;
}

/* ===================== INVITE MEMBER ===================== */

export async function inviteMember(ownerId, email, role) {
  const userRes = await db.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [email]
  );

  if (userRes.rowCount === 0) {
    throw new Error("User must sign up first");
  }

  const teamRes = await db.query(
    `SELECT id FROM teams WHERE owner_id = $1`,
    [ownerId]
  );

  const teamId = teamRes.rows[0].id;
  const userId = userRes.rows[0].id;

  // Prevent duplicate members
  const exists = await db.query(
    `
    SELECT 1 FROM team_members
    WHERE team_id = $1 AND user_id = $2
    `,
    [teamId, userId]
  );

  if (exists.rowCount > 0) {
    throw new Error("User already in team");
  }

  const insertRes = await db.query(
    `
    INSERT INTO team_members (team_id, user_id, role)
    VALUES ($1, $2, $3)
    RETURNING id, role
    `,
    [teamId, userId, role]
  );

  return {
    id: insertRes.rows[0].id,
    name: email.split("@")[0],
    email,
    role,
    avatar: email.slice(0, 2).toUpperCase(),
  };
}

/* ===================== UPDATE ROLE ===================== */

export async function updateMemberRole(ownerId, memberId, role) {
  await db.query(
    `
    UPDATE team_members
    SET role = $1
    WHERE id = $2
      AND team_id = (
        SELECT id FROM teams WHERE owner_id = $3
      )
    `,
    [role, memberId, ownerId]
  );
}

/* ===================== REMOVE MEMBER ===================== */

export async function removeMember(ownerId, memberId) {
  const result = await db.query(
    `
    DELETE FROM team_members tm
    USING teams t
    WHERE tm.id = $1
      AND tm.team_id = t.id
      AND t.owner_id = $2
      AND tm.user_id <> t.owner_id
    `,
    [memberId, ownerId]
  );

  return result.rowCount;
}
