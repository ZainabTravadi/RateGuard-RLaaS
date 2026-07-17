import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeSeriesPoint {
  time: string;
  rps: number;
  allowed: number;
  blocked: number;
}

interface AllowedVsBlockedPoint {
  name: string;
  allowed: number;
  blocked: number;
}

interface TopEndpointPoint {
  endpoint: string;
  requests: number;
  blocked: number;
  percentage: number;
}

interface AnalyticsResponse {
  timeSeries?: TimeSeriesPoint[];
  allowedVsBlocked?: AllowedVsBlockedPoint[];
  topEndpoints?: TopEndpointPoint[];
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);
  const [allowedVsBlockedData, setAllowedVsBlockedData] = useState<AllowedVsBlockedPoint[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpointPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = (await api(`/analytics?range=${timeRange}`)) as AnalyticsResponse;
        if (cancelled) return;
        setTimeSeriesData(res.timeSeries || []);
        setAllowedVsBlockedData(res.allowedVsBlocked || []);
        setTopEndpoints(res.topEndpoints || []);
      } catch (error) {
        console.error("Failed to load analytics:", error);
        setError("Failed to load analytics. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  return (
 
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Traffic Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Visualize your traffic patterns and rate limiting effectiveness
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests per Second */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Requests per Second</CardTitle>
            </CardHeader>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full px-6">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center text-red-500">
                  {error}
                </div>
              ) : timeSeriesData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No activity in last 30 days</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
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
                      dataKey="rps"
                      stroke="hsl(217, 91%, 60%)"
                      fillOpacity={1}
                      fill="url(#colorRps)"
                      strokeWidth={2}
                      name="Requests/sec"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Allowed vs Blocked */}
          <Card>
            <CardHeader>
              <CardTitle>Allowed vs Blocked Requests</CardTitle>
            </CardHeader>
            <div className="h-64">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full px-6">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center text-red-500">
                  {error}
                </div>
              ) : allowedVsBlockedData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No activity in last 30 days</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allowedVsBlockedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 8%)",
                        border: "1px solid hsl(222, 30%, 18%)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                    />
                    <Legend />
                    <Bar dataKey="allowed" fill="hsl(142, 76%, 45%)" name="Allowed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="blocked" fill="hsl(0, 84%, 60%)" name="Blocked" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Traffic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Over Time</CardTitle>
            </CardHeader>
            <div className="h-64">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full px-6">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center text-red-500">
                  {error}
                </div>
              ) : timeSeriesData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No activity in last 30 days</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBlockedArea" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="allowed"
                      stackId="1"
                      stroke="hsl(142, 76%, 45%)"
                      fill="url(#colorAllowed)"
                      strokeWidth={2}
                      name="Allowed"
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      stackId="1"
                      stroke="hsl(0, 84%, 60%)"
                      fill="url(#colorBlockedArea)"
                      strokeWidth={2}
                      name="Blocked"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Top Endpoints Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints by Traffic</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Endpoint</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Blocked</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">% of Traffic</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <Skeleton className="h-6 w-1/3 mb-4" />
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-red-500">{error}</td>
                  </tr>
                ) : topEndpoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">No endpoints yet</td>
                  </tr>
                ) : (
                    topEndpoints.map((endpoint, index) => {
                    return (
                      <tr key={endpoint.endpoint} className="table-row">
                        <td className="py-3 px-4">
                          <code className="text-sm font-mono text-primary">{endpoint.endpoint}</code>
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-foreground font-medium">
                          {endpoint.requests.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-danger font-medium">
                          {endpoint.blocked.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                          {endpoint.percentage}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${endpoint.percentage}%`, animationDelay: `${index * 100}ms` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    
  );
}
