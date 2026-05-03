import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download
} from "lucide-react";
import { api } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBase";

interface LogEntry {
  id: string;
  timestamp: string;
  ip: string;
  userId: string | null;
  endpoint: string;
  status: "allowed" | "blocked";
  rule: string;
  responseTime: number;
}

interface AnalyticsSummary {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  topEndpoints: Array<{
    key: string;
    requests: number;
    blocked: number;
    blockRate: number;
  }>;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* ---------------- FETCH LOGS ---------------- */
  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    Promise.all([
      api(
        `/logs?search=${encodeURIComponent(
          searchQuery
        )}&status=${statusFilter}&page=${currentPage}`
      ),
      api("/analytics/overview")
    ])
      .then(([data, analytics]) => {
        if (!cancelled) {
          setLogs(data);
          setSummary(analytics);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, statusFilter, currentPage]);

  /* ---------------- EXPORT LOGS TO EXCEL ---------------- */
  const handleExportLogs = async () => {
    try {
      setExporting(true);
      
      // Build query string with current filters
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const token = localStorage.getItem("token");
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/logs/export/excel?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to export logs");
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export logs. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- UI HELPERS ---------------- */
  const getStatusBadge = (status: LogEntry["status"]) => {
    const styles = {
      allowed: "status-allowed",
      blocked: "status-blocked"
    };

    const labels = {
      allowed: "Allowed",
      blocked: "Blocked"
    };

    return (
      <span className={`badge-pill border ${styles[status]}`}>
        {labels[status]}
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
          <Button 
            onClick={handleExportLogs}
            disabled={exporting || logs.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export Logs"}
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Requests</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{summary.totalRequests.toLocaleString()}</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked</p>
                <p className="mt-2 text-2xl font-semibold text-danger">{summary.blockedRequests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.blockRate}% block rate</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top Endpoint</p>
                <p className="mt-2 text-sm font-mono text-foreground">{summary.topEndpoints[0]?.key || "N/A"}</p>
              </div>
            </Card>
          </div>
        )}

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
                {logs.map((log) => (
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
              Showing {logs.length} of {logs.length} entries
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
