import { useEffect, useState } from "react";
import { Activity, Shield, Server, Ban, TrendingUp, Clock, AlertCircle, Zap } from "lucide-react";
import { StatCard, StatusBadge, Card, CardHeader, CardTitle } from "@/components/ui/stat-card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { AnalyticsSummary, normalizeOverviewAnalytics } from "@/lib/analytics";

interface OverviewData {
  stats: {
    totalRequests: number;
    blockedRequests: number;
    blockRate: number;
    uniqueIPs: number;
    uniqueEndpoints: number;
    activeRules: number;
    protectedServices: number;
    requestGrowth: string;
    blockGrowth: string;
  };
  trafficData: Array<{
    time: string;
    requests: number;
    blocked: number;
  }>;
  performance: {
    avg_response_time: number;
    uptime_percentage: number;
    peak_rps: number;
  };
  activity: Array<{
    id: string;
    event: string;
    endpoint: string;
    time: string;
    status: "blocked" | "warning" | "info";
    method: string;
    ip: string;
  }>;
  insights: {
    peakLoadTime: { hour: number | null; display: string; requests: number };
    topEndpoint: { endpoint: string; total_requests: number; block_rate: number } | null;
    mostTriggeredRule: { rule_id: string; trigger_count: number } | null;
    statusDistribution: Array<{ status_code: number; count: number }>;
  };
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [overviewResponse, analyticsResponse] = await Promise.all([
          api("/overview"),
          api("/analytics/overview?range=30d")
        ]);

        if (overviewResponse.success) {
          setData(overviewResponse.data);
        } else {
          setError(overviewResponse.message || "Failed to fetch data");
        }

        console.log("FRONTEND ANALYTICS", analyticsResponse);
        setAnalyticsSummary(normalizeOverviewAnalytics(analyticsResponse));
      } catch (err) {
        console.error("Error fetching overview data:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load overview data. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (error && !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  return (
  
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">Monitor your rate limiting performance in real-time</p>
          </div>
          <StatusBadge status="healthy" />
        </div>

        {analyticsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Tracked Requests"
              value={(analyticsSummary.totalRequests ?? 0).toLocaleString()}
              change="Redis counters"
              changeType="neutral"
              icon={Activity}
            />
            <StatCard
              title="Tracked Blocks"
              value={(analyticsSummary.blockedRequests ?? 0).toLocaleString()}
              change={`${analyticsSummary.blockRate ?? 0}% block rate`}
              changeType="neutral"
              icon={Ban}
              iconColor="text-danger"
            />
            <StatCard
              title="Allowed Requests"
              value={(analyticsSummary.allowedRequests ?? 0).toLocaleString()}
              change={`${analyticsSummary.topEndpoints[0]?.key || "No endpoints yet"}`}
              changeType="positive"
              icon={TrendingUp}
            />
          </div>
        )}

        {analyticsSummary?.recentHours?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Requests Per Hour</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 px-4 pb-4">
              {analyticsSummary.recentHours.slice(0, 6).map((item) => (
                <div key={item.key} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{item.key}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{item.requests.toLocaleString()}</p>
                  <p className="text-xs text-danger">{item.blocked.toLocaleString()} blocked</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Requests (30d)"
            value={data.stats.totalRequests.toLocaleString()}
            change={`${data.stats.requestGrowth}% from yesterday`}
            changeType={parseFloat(data.stats.requestGrowth) >= 0 ? "positive" : "negative"}
            icon={Activity}
          />
          <StatCard
            title="Blocked Requests"
            value={data.stats.blockedRequests.toLocaleString()}
            change={`${data.stats.blockRate}% block rate`}
            changeType="neutral"
            icon={Ban}
            iconColor="text-danger"
          />
          <StatCard
            title="Active Rules"
            value={data.stats.activeRules.toString()}
            change={`${data.stats.activeRules} protecting endpoints`}
            changeType="neutral"
            icon={Shield}
          />
          <StatCard
            title="Protected Environments"
            value={data.stats.protectedServices.toString()}
            change={`${data.stats.uniqueEndpoints} unique endpoints`}
            changeType="positive"
            icon={Server}
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Unique IP Addresses"
            value={data.stats.uniqueIPs.toString()}
            change="in last 24 hours"
            changeType="neutral"
            icon={AlertCircle}
          />
          <StatCard
            title="Peak Requests/Hour"
            value={data.performance.peak_rps.toString()}
            change={`at ${data.insights.peakLoadTime.display}`}
            changeType="neutral"
            icon={Zap}
            iconColor="text-warning"
          />
          <StatCard
            title="System Uptime"
            value={`${data.performance.uptime_percentage}%`}
            change="last 30 days"
            changeType={data.performance.uptime_percentage >= 99.9 ? "positive" : "warning"}
            icon={TrendingUp}
            iconColor="text-success"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Traffic Overview</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Total Requests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-danger" />
                    <span className="text-muted-foreground">Blocked</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trafficData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis dataKey="time" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 8%)",
                      border: "1px solid hsl(222, 30%, 18%)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(217, 91%, 60%)"
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="hsl(0, 84%, 60%)"
                    fillOpacity={1}
                    fill="url(#colorBlocked)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
            </CardHeader>
            <div className="space-y-4 px-4 pb-4">
              {data.insights.topEndpoint && (
                <div className="border-l-2 border-primary pl-3 py-2">
                  <p className="text-xs text-muted-foreground">Busiest Endpoint</p>
                  <p className="text-sm font-semibold text-foreground">{data.insights.topEndpoint.endpoint}</p>
                  <p className="text-xs text-muted-foreground">{data.insights.topEndpoint.total_requests} requests • {data.insights.topEndpoint.block_rate}% blocked</p>
                </div>
              )}

              {data.insights.peakLoadTime.hour !== null && (
                <div className="border-l-2 border-warning pl-3 py-2">
                  <p className="text-xs text-muted-foreground">Peak Load Time</p>
                  <p className="text-sm font-semibold text-foreground">{data.insights.peakLoadTime.display}</p>
                  <p className="text-xs text-muted-foreground">{data.insights.peakLoadTime.requests} requests</p>
                </div>
              )}

              <div className="border-l-2 border-info pl-3 py-2">
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                <p className="text-sm font-semibold text-foreground">{data.performance.avg_response_time.toFixed(1)}ms</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <div className="space-y-1">
            {data.activity && data.activity.length > 0 ? (
              data.activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.status === "blocked" ? "bg-danger" : 
                      item.status === "warning" ? "bg-warning" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.event}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.endpoint} • {item.method} • {item.ip}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">{item.time}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">No activity in the last 24 hours</p>
            )}
          </div>
        </Card>
      </div>
    
  );
}
