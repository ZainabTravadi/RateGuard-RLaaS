import { db } from "../../db/index.js";

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        COUNT(*) AS total_requests_24h,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_requests_24h,
        COUNT(DISTINCT endpoint) AS unique_endpoints,
        COUNT(DISTINCT ip_address) AS unique_ips,
        COUNT(DISTINCT CASE WHEN rule_id IS NOT NULL THEN rule_id END) AS triggered_rules
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      `,
      [userId]
    );

    return rows[0] || {
      total_requests_24h: 0,
      blocked_requests_24h: 0,
      unique_endpoints: 0,
      unique_ips: 0,
      triggered_rules: 0
    };
  } catch (err) {
    console.error("getDashboardStats error:", err);
    throw err;
  }
}

/**
 * Get 7-day comparison for trend
 */
export async function getSevenDayComparison(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        COUNT(*) AS requests_7d,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') AS requests_1d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day' AND status_code = 429) AS blocked_1d
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '7 days'
      `,
      [userId]
    );

    return rows[0] || {
      requests_7d: 0,
      blocked_7d: 0,
      requests_1d: 0,
      blocked_1d: 0
    };
  } catch (err) {
    console.error("getSevenDayComparison error:", err);
    throw err;
  }
}

/**
 * Get active rules count
 */
export async function getActiveRulesCount(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT COUNT(*) AS active_rules
      FROM rate_limit_rules
      WHERE user_id = $1 AND enabled = true
      `,
      [userId]
    );

    return rows[0] || { active_rules: 0 };
  } catch (err) {
    console.error("getActiveRulesCount error:", err);
    return { active_rules: 0 };
  }
}

/**
 * Get protected environments/services count
 */
export async function getProtectedServicesCount(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT COUNT(*) AS protected_services
      FROM environments
      WHERE user_id = $1 AND is_active = true
      `,
      [userId]
    );

    return rows[0] || { protected_services: 0 };
  } catch (err) {
    console.error("getProtectedServicesCount error:", err);
    return { protected_services: 0 };
  }
}

/**
 * Get top endpoints by traffic
 */
export async function getTopEndpoints(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        endpoint,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_count,
        ROUND((COUNT(*) FILTER (WHERE status_code = 429)::NUMERIC / COUNT(*)) * 100, 2) AS block_rate
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY endpoint
      ORDER BY total_requests DESC
      LIMIT 5
      `,
      [userId]
    );

    return rows || [];
  } catch (err) {
    console.error("getTopEndpoints error:", err);
    return [];
  }
}

/**
 * Get peak load time (hour with most requests)
 */
export async function getPeakLoadTime(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        EXTRACT(HOUR FROM created_at)::INTEGER AS hour,
        COUNT(*) AS request_count
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY request_count DESC
      LIMIT 1
      `,
      [userId]
    );

    const hour = rows[0]?.hour;
    if (hour !== undefined) {
      return {
        hour,
        display: `${String(hour).padStart(2, '0')}:00`,
        requests: parseInt(rows[0].request_count)
      };
    }
    return { hour: null, display: "N/A", requests: 0 };
  } catch (err) {
    console.error("getPeakLoadTime error:", err);
    return { hour: null, display: "N/A", requests: 0 };
  }
}

/**
 * Get most triggered rule
 */
export async function getMostTriggeredRule(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        rule_id,
        COUNT(*) AS trigger_count
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
        AND rule_id IS NOT NULL
      GROUP BY rule_id
      ORDER BY trigger_count DESC
      LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  } catch (err) {
    console.error("getMostTriggeredRule error:", err);
    return null;
  }
}

/**
 * Get traffic distribution by status code
 */
export async function getStatusCodeDistribution(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        status_code,
        COUNT(*) AS count
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status_code
      ORDER BY count DESC
      `,
      [userId]
    );

    return rows || [];
  } catch (err) {
    console.error("getStatusCodeDistribution error:", err);
    return [];
  }
}

/**
 * Get hourly traffic data for chart
 */
export async function getHourlyTrafficData(userId) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        date_trunc('hour', created_at) AS time,
        COUNT(*) AS requests,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('hour', created_at)
      ORDER BY time
      `,
      [userId]
    );

    if (rows.length === 0) {
      return generateEmptyTrafficData();
    }

    return rows.map(row => ({
      time: new Date(row.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      requests: parseInt(row.requests),
      blocked: parseInt(row.blocked)
    }));
  } catch (err) {
    console.error("getHourlyTrafficData error:", err);
    throw err;
  }
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(userId) {
  try {
    // Get uptime (successful requests percentage)
    const { rows: uptimeRows } = await db.query(
      `
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 100
          ELSE ROUND((COUNT(*) FILTER (WHERE status_code != 429)::NUMERIC / COUNT(*)) * 100, 2)
        END AS uptime_percentage
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      `,
      [userId]
    );

    // Get peak requests per hour
    const { rows: peakRpsRows } = await db.query(
      `
      SELECT
        MAX(req_count)::INTEGER AS peak_rps
      FROM (
        SELECT COUNT(*) AS req_count
        FROM api_key_logs
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', created_at)
      ) hourly
      `,
      [userId]
    );

    // Average response time estimate (based on request frequency)
    const { rows: responseTimeRows } = await db.query(
      `
      SELECT
        ROUND(AVG(interval_ms)::NUMERIC, 1) AS avg_response_time
      FROM (
        SELECT
          EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY ip_address ORDER BY created_at))) * 1000 AS interval_ms
        FROM api_key_logs
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 10000
      ) intervals
      WHERE interval_ms > 0 AND interval_ms < 5000
      `,
      [userId]
    );

    return {
      avg_response_time: Math.max(responseTimeRows[0]?.avg_response_time || 25, 1),
      uptime_percentage: uptimeRows[0]?.uptime_percentage || 100,
      peak_rps: peakRpsRows[0]?.peak_rps || 0
    };
  } catch (err) {
    console.error("getPerformanceMetrics error:", err);
    throw err;
  }
}

/**
 * Get recent activity with proper categorization
 */
export async function getRecentActivity(userId, limit = 6) {
  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
        created_at,
        endpoint,
        status_code,
        rule_id,
        ip_address,
        method
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return rows.map(row => {
      let event = "";
      let status = "info";

      if (row.status_code === 429) {
        event = "Rate limit triggered";
        status = "blocked";
      } else if (row.rule_id) {
        event = "Rule matched";
        status = "warning";
      } else {
        event = "Request allowed";
        status = "info";
      }

      return {
        id: row.id,
        event,
        endpoint: row.endpoint,
        time: getTimeAgo(row.created_at),
        status,
        method: row.method,
        ip: row.ip_address
      };
    });
  } catch (err) {
    console.error("getRecentActivity error:", err);
    throw err;
  }
}

/**
 * Helper function to convert timestamp to relative time string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Get complete overview data
 */
export async function getCompleteOverview(userId) {
  try {
    console.log("Fetching overview data for user:", userId);

    const [
      stats,
      sevenDayStats,
      activeRules,
      services,
      topEndpoints,
      peakTime,
      mostTriggeredRule,
      statusDistribution,
      trafficData,
      performance,
      activity
    ] = await Promise.all([
      getDashboardStats(userId),
      getSevenDayComparison(userId),
      getActiveRulesCount(userId),
      getProtectedServicesCount(userId),
      getTopEndpoints(userId),
      getPeakLoadTime(userId),
      getMostTriggeredRule(userId),
      getStatusCodeDistribution(userId),
      getHourlyTrafficData(userId),
      getPerformanceMetrics(userId),
      getRecentActivity(userId)
    ]);

    // Calculate growth percentage
    const prevDayRequests = sevenDayStats.requests_7d - stats.total_requests_24h;
    const requestGrowth = prevDayRequests > 0
      ? (((stats.total_requests_24h - prevDayRequests) / prevDayRequests) * 100).toFixed(1)
      : 0;

    const prevDayBlocked = sevenDayStats.blocked_7d - stats.blocked_requests_24h;
    const blockGrowth = prevDayBlocked > 0
      ? (((stats.blocked_requests_24h - prevDayBlocked) / prevDayBlocked) * 100).toFixed(1)
      : 0;

    return {
      stats: {
        totalRequests: parseInt(stats?.total_requests_24h || 0),
        blockedRequests: parseInt(stats?.blocked_requests_24h || 0),
        blockRate: stats?.total_requests_24h > 0
          ? ((stats.blocked_requests_24h / stats.total_requests_24h) * 100).toFixed(2)
          : 0,
        uniqueIPs: parseInt(stats?.unique_ips || 0),
        uniqueEndpoints: parseInt(stats?.unique_endpoints || 0),
        activeRules: parseInt(activeRules?.active_rules || 0),
        protectedServices: parseInt(services?.protected_services || 0),
        requestGrowth,
        blockGrowth
      },
      insights: {
        peakLoadTime: peakTime,
        topEndpoint: topEndpoints[0] || null,
        mostTriggeredRule,
        statusDistribution
      },
      trafficData: trafficData || generateEmptyTrafficData(),
      performance,
      activity
    };
  } catch (err) {
    console.error("getCompleteOverview error:", err);
    throw err;
  }
}

/**
 * Generate empty traffic data if no data exists
 */
function generateEmptyTrafficData() {
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      time: `${String(i).padStart(2, '0')}:00`,
      requests: 0,
      blocked: 0
    });
  }
  return data;
}
