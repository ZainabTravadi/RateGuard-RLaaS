import { db } from "../../db/index.js";

export async function getTimeSeriesAnalytics(userId, interval) {
  const bucket =
    interval === "1h" ? "minute" :
    interval === "24h" ? "hour" :
    interval === "7d" ? "day" :
    "day";

  const { rows } = await db.query(
    `
    SELECT
      date_trunc($2, created_at) AS time,
      COUNT(*) AS rps,
      COUNT(*) FILTER (WHERE status_code != 429) AS allowed,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY time
    ORDER BY time
    `,
    [userId, bucket]
  );

  return rows;
}

export async function getAllowedVsBlocked(userId) {
  const { rows } = await db.query(
    `
    SELECT
      to_char(created_at, 'Dy') AS name,
      COUNT(*) FILTER (WHERE status_code != 429) AS allowed,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY name
    ORDER BY MIN(created_at)
    `,
    [userId]
  );

  return rows;
}

export async function getTopEndpoints(userId) {
  const { rows } = await db.query(
    `
    SELECT
      endpoint,
      COUNT(*) AS requests,
      COUNT(*) FILTER (WHERE status_code = 429) AS blocked
    FROM api_key_logs
    WHERE user_id = $1
    GROUP BY endpoint
    ORDER BY requests DESC
    LIMIT 10
    `,
    [userId]
  );

  return rows.map(r => ({
    ...r,
    percentage: Math.round((r.requests / rows[0].requests) * 100)
  }));
}
