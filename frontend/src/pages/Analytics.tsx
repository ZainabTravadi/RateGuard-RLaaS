import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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

const timeSeriesData = [
  { time: "00:00", rps: 120, allowed: 115, blocked: 5 },
  { time: "02:00", rps: 80, allowed: 78, blocked: 2 },
  { time: "04:00", rps: 60, allowed: 59, blocked: 1 },
  { time: "06:00", rps: 150, allowed: 142, blocked: 8 },
  { time: "08:00", rps: 280, allowed: 265, blocked: 15 },
  { time: "10:00", rps: 340, allowed: 320, blocked: 20 },
  { time: "12:00", rps: 380, allowed: 355, blocked: 25 },
  { time: "14:00", rps: 320, allowed: 305, blocked: 15 },
  { time: "16:00", rps: 290, allowed: 278, blocked: 12 },
  { time: "18:00", rps: 250, allowed: 242, blocked: 8 },
  { time: "20:00", rps: 200, allowed: 195, blocked: 5 },
  { time: "22:00", rps: 160, allowed: 156, blocked: 4 },
];

const allowedVsBlockedData = [
  { name: "Mon", allowed: 12500, blocked: 340 },
  { name: "Tue", allowed: 14200, blocked: 420 },
  { name: "Wed", allowed: 13800, blocked: 380 },
  { name: "Thu", allowed: 15600, blocked: 510 },
  { name: "Fri", allowed: 16200, blocked: 580 },
  { name: "Sat", allowed: 9800, blocked: 220 },
  { name: "Sun", allowed: 8400, blocked: 180 },
];

const topEndpoints = [
  { endpoint: "/api/users", requests: 45200, blocked: 1200, percentage: 28 },
  { endpoint: "/api/auth/login", requests: 32100, blocked: 890, percentage: 20 },
  { endpoint: "/api/products", requests: 28400, blocked: 420, percentage: 18 },
  { endpoint: "/api/orders", requests: 18900, blocked: 310, percentage: 12 },
  { endpoint: "/api/search", requests: 15600, blocked: 580, percentage: 10 },
  { endpoint: "/api/analytics", requests: 12300, blocked: 150, percentage: 8 },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("24h");

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
            </div>
          </Card>

          {/* Allowed vs Blocked */}
          <Card>
            <CardHeader>
              <CardTitle>Allowed vs Blocked Requests</CardTitle>
            </CardHeader>
            <div className="h-64">
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
            </div>
          </Card>

          {/* Traffic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Over Time</CardTitle>
            </CardHeader>
            <div className="h-64">
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
                {topEndpoints.map((endpoint, index) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    
  );
}
