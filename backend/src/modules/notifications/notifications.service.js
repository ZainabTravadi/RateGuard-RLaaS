import { db } from "../../db/index.js";
import { DatabaseError, ValidationError } from "../../errors/index.js";

export async function createNotification(userId, type, payload, client = null) {
  const dbClient = client || db;
  try {
    const { rows } = await dbClient.query(
      `
      INSERT INTO notifications (user_id, type, payload, is_read)
      VALUES ($1, $2, $3, false)
      RETURNING id, created_at
      `,
      [userId, type, JSON.stringify(payload)]
    );

    return rows[0];
  } catch (error) {
    throw new DatabaseError("Failed to create notification.", {
      cause: error,
      details: { userId, type },
    });
  }
}

export async function getUserNotifications(userId, limit = 50) {
  const { rows } = await db.query(
    `
    SELECT
      id,
      type,
      payload,
      is_read,
      created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    is_read: row.is_read,
    created_at: row.created_at,
  }));
}

export async function markAsRead(notificationId, userId) {
  const { rows } = await db.query(
    `
    UPDATE notifications
    SET is_read = true, updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING id
    `,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    throw new ValidationError("Notification not found.", {
      details: { notificationId, userId },
    });
  }

  return { success: true };
}

export async function markAllAsRead(userId) {
  await db.query(`UPDATE notifications SET is_read = true, updated_at = now() WHERE user_id = $1 AND is_read = false`, [userId]);
  return { success: true };
}

export async function getUnreadCount(userId) {
  const { rows } = await db.query(`SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false`, [userId]);
  return rows[0].count;
}

export async function deleteNotification(notificationId, userId) {
  const { rows } = await db.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    throw new ValidationError("Notification not found.", {
      details: { notificationId, userId },
    });
  }

  return { success: true };
}

