import { db } from "../../db/index.js";

/**
 * Create a notification for a user
 */
export async function createNotification(userId, type, payload, client = null) {
  const dbClient = client || db;

  const { rows } = await dbClient.query(
    `
    INSERT INTO notifications (user_id, type, payload, is_read)
    VALUES ($1, $2, $3, false)
    RETURNING id, created_at
    `,
    [userId, type, JSON.stringify(payload)]
  );

  return rows[0];
}

/**
 * Get user notifications
 */
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

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    is_read: row.is_read,
    created_at: row.created_at
  }));
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId, userId) {
  const { rows } = await db.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2
    RETURNING id
    `,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    throw new Error("Notification not found");
  }

  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
  await db.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return { success: true };
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return rows[0].count;
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId, userId) {
  const { rows } = await db.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    throw new Error("Notification not found");
  }

  return { success: true };
}
