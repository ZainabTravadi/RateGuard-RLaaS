import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Filter, Download } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  ip: string;
  userId: string | null;
  endpoint: string;
  status: "allowed" | "throttled" | "blocked";
  rule: string;
  responseTime: number;
}

const mockLogs: LogEntry[] = [
  { id: "1", timestamp: "2024-01-15 14:32:45", ip: "192.168.1.45", userId: "user_123", endpoint: "/api/users", status: "allowed", rule: "-", responseTime: 12 },
  { id: "2", timestamp: "2024-01-15 14:32:44", ip: "10.0.0.122", userId: null, endpoint: "/api/auth/login", status: "throttled", rule: "Requests per IP", responseTime: 8 },
  { id: "3", timestamp: "2024-01-15 14:32:43", ip: "172.16.0.55", userId: "user_456", endpoint: "/api/products", status: "allowed", rule: "-", responseTime: 15 },
  { id: "4", timestamp: "2024-01-15 14:32:42", ip: "192.168.1.45", userId: null, endpoint: "/api/auth/login", status: "blocked", rule: "Requests per Minute", responseTime: 5 },
  { id: "5", timestamp: "2024-01-15 14:32:41", ip: "10.0.0.89", userId: "user_789", endpoint: "/api/orders", status: "allowed", rule: "-", responseTime: 22 },
  { id: "6", timestamp: "2024-01-15 14:32:40", ip: "172.16.0.12", userId: null, endpoint: "/api/search", status: "throttled", rule: "Burst Capacity", responseTime: 45 },
  { id: "7", timestamp: "2024-01-15 14:32:39", ip: "192.168.1.100", userId: "user_321", endpoint: "/api/analytics", status: "allowed", rule: "-", responseTime: 18 },
  { id: "8", timestamp: "2024-01-15 14:32:38", ip: "10.0.0.45", userId: null, endpoint: "/api/auth/login", status: "blocked", rule: "Requests per IP", responseTime: 3 },
  { id: "9", timestamp: "2024-01-15 14:32:37", ip: "172.16.0.78", userId: "user_654", endpoint: "/api/users", status: "allowed", rule: "-", responseTime: 11 },
  { id: "10", timestamp: "2024-01-15 14:32:36", ip: "192.168.1.200", userId: null, endpoint: "/api/products", status: "allowed", rule: "-", responseTime: 14 },
];

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = 
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery) ||
      (log.userId && log.userId.includes(searchQuery));
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LogEntry["status"]) => {
    const statusStyles = {
      allowed: "status-allowed",
      throttled: "status-warning",
      blocked: "status-blocked",
    };
    const statusLabels = {
      allowed: "Allowed",
      throttled: "Throttled",
      blocked: "Blocked",
    };
    return (
      <span className={`badge-pill border ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  return (
  
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs</h1>
            <p className="text-muted-foreground mt-1">
              View detailed request logs and rate limiting events
            </p>
          </div>
          <Button variant="outline" className="border-border hover:bg-muted">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by endpoint, IP, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-muted/50 border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="allowed">Allowed</SelectItem>
                  <SelectItem value="throttled">Throttled</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP / User ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Endpoint</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rule Triggered</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-muted-foreground">{log.timestamp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono text-foreground">{log.ip}</span>
                        {log.userId && (
                          <span className="text-xs text-muted-foreground">{log.userId}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-sm font-mono text-primary">{log.endpoint}</code>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {log.rule === "-" ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : log.rule}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm text-foreground">{log.responseTime}ms</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {mockLogs.length} entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={page === currentPage ? "bg-primary" : "text-muted-foreground"}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                className="text-muted-foreground"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    
  );
}
