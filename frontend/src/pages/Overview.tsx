import { Activity, Shield, Server, Ban, TrendingUp, Clock } from "lucide-react";
import { StatCard, StatusBadge, Card, CardHeader, CardTitle } from "@/components/ui/stat-card";
import { AppLayout } from "@/components/layout/AppLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockTrafficData = [
  { time: "00:00", requests: 1200, blocked: 45 },
  { time: "04:00", requests: 800, blocked: 20 },
  { time: "08:00", requests: 2400, blocked: 120 },
  { time: "12:00", requests: 3200, blocked: 180 },
  { time: "16:00", requests: 2800, blocked: 95 },
  { time: "20:00", requests: 1800, blocked: 60 },
  { time: "23:59", requests: 1400, blocked: 40 },
];

const recentActivity = [
  { id: 1, event: "Rate limit triggered", endpoint: "/api/users", time: "2 min ago", status: "blocked" },
  { id: 2, event: "New rule activated", endpoint: "Global", time: "15 min ago", status: "info" },
  { id: 3, event: "Burst capacity reached", endpoint: "/api/orders", time: "1 hour ago", status: "warning" },
  { id: 4, event: "Traffic spike detected", endpoint: "/api/auth", time: "2 hours ago", status: "warning" },
];

export default function OverviewPage() {
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Requests Today"
            value="1.2M"
            change="+12.5% from yesterday"
            changeType="positive"
            icon={Activity}
          />
          <StatCard
            title="Blocked Requests"
            value="24.8K"
            change="2.1% of total traffic"
            changeType="neutral"
            icon={Ban}
            iconColor="text-danger"
          />
          <StatCard
            title="Active Rules"
            value="12"
            change="3 updated this week"
            changeType="neutral"
            icon={Shield}
          />
          <StatCard
            title="Protected Services"
            value="8"
            change="All healthy"
            changeType="positive"
            icon={Server}
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
                <AreaChart data={mockTrafficData}>
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
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 border border-success/20">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Avg Response Time</p>
                    <p className="text-xs text-muted-foreground">Last 24 hours</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">12ms</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Uptime</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">99.99%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 border border-warning/20">
                    <Activity className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Peak RPS</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">3.2K</span>
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
            {recentActivity.map((item) => (
              <div key={item.id} className="table-row flex items-center justify-between py-3 px-2 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${
                    item.status === "blocked" ? "bg-danger" : 
                    item.status === "warning" ? "bg-warning" : "bg-primary"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.event}</p>
                    <p className="text-xs text-muted-foreground">{item.endpoint}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    
  );
}
