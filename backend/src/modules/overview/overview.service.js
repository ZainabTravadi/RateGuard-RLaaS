import { db } from "../../db/index.js";

function parseRange(range = '30d') {
  if (typeof range !== 'string') range = '30d';
  const m = range.match(/^(\d+)([dh])$/);
  if (!m) return { intervalSql: '30 days', days: 30, granularity: 'day' };
  const num = Number(m[1]);
  const unit = m[2];
  if (unit === 'h') return { intervalSql: `${num} hours`, days: Math.ceil(num / 24), granularity: num <= 24 ? 'hour' : 'day' };
  return { intervalSql: `${num} days`, days: num, granularity: num <= 2 ? 'hour' : 'day' };
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(userId, range = '30d') {
  try {
    const { intervalSql } = parseRange(range);
    const { rows } = await db.query(
      `
      SELECT
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_requests,
        COUNT(DISTINCT endpoint) AS unique_endpoints,
        COUNT(DISTINCT ip_address) AS unique_ips,
        COUNT(DISTINCT CASE WHEN rule_id IS NOT NULL THEN rule_id END) AS triggered_rules
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '${intervalSql}'
      `,
      [userId]
    );

    return rows[0] || {
      total_requests: 0,
      blocked_requests: 0,
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
export async function getSevenDayComparison(userId, range = '30d') {
  try {
    const { intervalSql } = parseRange(range);
    const { rows } = await db.query(
      `
      SELECT
        COUNT(*) AS requests_range,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_range,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') AS requests_1d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day' AND status_code = 429) AS blocked_1d
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '${intervalSql}'
      `,
      [userId]
    );

    return rows[0] || {
      requests_range: 0,
      blocked_range: 0,
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
export async function getTopEndpoints(userId, range = '30d', limit = 5) {
  try {
    const { intervalSql } = parseRange(range);
    const { rows } = await db.query(
      `
      SELECT
        endpoint,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked_count,
        ROUND((COUNT(*) FILTER (WHERE status_code = 429)::NUMERIC / COUNT(*)) * 100, 2) AS block_rate
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '${intervalSql}'
      GROUP BY endpoint
      ORDER BY total_requests DESC
      LIMIT $2
      `,
      [userId, limit]
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
export async function getMostTriggeredRule(userId, range = '30d') {
  try {
    const { rows } = await db.query(
      `
      SELECT
        rule_id,
        COUNT(*) AS trigger_count
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
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
export async function getStatusCodeDistribution(userId, range = '30d') {
  try {
    const { intervalSql } = parseRange(range);
    const { rows } = await db.query(
      `
      SELECT
        status_code,
        COUNT(*) AS count
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '${intervalSql}'
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
export async function getHourlyTrafficData(userId, range = '30d') {
  try {
    const { intervalSql, granularity, days } = parseRange(range);

    const trunc = granularity === 'hour' ? 'hour' : 'day';
    const { rows } = await db.query(
      `
      SELECT
        date_trunc('${trunc}', created_at) AS time,
        COUNT(*) AS requests,
        COUNT(*) FILTER (WHERE status_code = 429) AS blocked
      FROM api_key_logs
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '${intervalSql}'
      GROUP BY date_trunc('${trunc}', created_at)
      ORDER BY time
      `,
      [userId]
    );

    if (rows.length === 0) {
      if (granularity === 'hour') return generateEmptyTrafficData();
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        data.push({ time: d.toISOString().slice(0, 10), requests: 0, blocked: 0 });
      }
      return data;
    }

    return rows.map(row => ({
      time: granularity === 'hour'
        ? new Date(row.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : new Date(row.time).toISOString().slice(0, 10),
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
export async function getPerformanceMetrics(userId, range = '30d') {
  try {
    const { intervalSql } = parseRange(range);
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
        AND created_at > NOW() - INTERVAL '${intervalSql}'
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
export async function getRecentActivity(userId, range = '30d', limit = 6) {
  try {
    const { intervalSql } = parseRange(range);
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
        AND created_at > NOW() - INTERVAL '${intervalSql}'
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
export async function getCompleteOverview(userId, range = '30d') {
  try {
    console.log("Fetching overview data for user:", userId, "range:", range);

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
      getDashboardStats(userId, range),
      getSevenDayComparison(userId, range),
      getActiveRulesCount(userId),
      getProtectedServicesCount(userId),
      getTopEndpoints(userId, range, 5),
      getPeakLoadTime(userId, range),
      getMostTriggeredRule(userId, range),
      getStatusCodeDistribution(userId, range),
      getHourlyTrafficData(userId, range),
      getPerformanceMetrics(userId, range),
      getRecentActivity(userId, range)
    ]);

    // For now, avoid guessing growth numbers — set safe defaults
    const requestGrowth = 0;
    const blockGrowth = 0;

    return {
      stats: {
        totalRequests: parseInt(stats?.total_requests || 0),
        blockedRequests: parseInt(stats?.blocked_requests || 0),
        blockRate: stats?.total_requests > 0
          ? ((stats.blocked_requests / stats.total_requests) * 100).toFixed(2)
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
