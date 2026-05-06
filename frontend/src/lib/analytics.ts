export const ANALYTICS_FIELDS = {
  totalRequests: "totalRequests",
  blockedRequests: "blockedRequests",
  blockRate: "blockRate",
  blocked: "blocked",
  requests: "requests",
} as const;

export interface AnalyticsSummary {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;
  topEndpoints: Array<{
    key: string;
    requests: number;
    blocked: number;
    blockRate: number;
  }>;
  recentHours: Array<{
    key: string;
    requests: number;
    blocked: number;
    blockRate: number;
  }>;
  recentDays: Array<{
    key: string;
    requests: number;
    blocked: number;
    blockRate: number;
  }>;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function blockRate(requests: number, blocked: number) {
  return requests > 0 ? Number(((blocked / requests) * 100).toFixed(2)) : 0;
}

export function normalizeOverviewAnalytics(response: any): AnalyticsSummary {
  const stats = response?.stats ?? {};
  const topEndpoint = response?.insights?.topEndpoint;
  const trafficData = Array.isArray(response?.trafficData) ? response.trafficData : [];
  const totalRequests = toNumber(stats[ANALYTICS_FIELDS.totalRequests]);
  const blockedRequests = toNumber(stats[ANALYTICS_FIELDS.blockedRequests]);

  const normalizedTraffic = trafficData.map((item: any) => {
    const requests = toNumber(item?.[ANALYTICS_FIELDS.requests]);
    const blocked = toNumber(item?.[ANALYTICS_FIELDS.blocked]);

    return {
      key: item?.time ?? "unknown",
      requests,
      blocked,
      blockRate: blockRate(requests, blocked),
    };
  });

  return {
    totalRequests,
    allowedRequests: Math.max(totalRequests - blockedRequests, 0),
    blockedRequests,
    blockRate: toNumber(stats[ANALYTICS_FIELDS.blockRate], blockRate(totalRequests, blockedRequests)),
    topEndpoints: topEndpoint
      ? [{
          key: topEndpoint.endpoint ?? "No endpoints yet",
          requests: toNumber(topEndpoint.total_requests),
          blocked: toNumber(topEndpoint.blocked_count),
          blockRate: toNumber(topEndpoint.block_rate),
        }]
      : [],
    recentHours: normalizedTraffic,
    recentDays: normalizedTraffic,
  };
}
