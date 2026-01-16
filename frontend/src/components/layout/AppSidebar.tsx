import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Plug,
  Shield,
  BarChart3,
  FileText,
  Settings,
  Zap,
} from "lucide-react";
import api from "@/lib/api";

const navigation = [
  { name: "Overview", href: "/app", icon: LayoutDashboard },
  { name: "Integrations", href: "/app/integrations", icon: Plug },
  { name: "Rules & Policies", href: "/app/rules", icon: Shield },
  { name: "Traffic Analytics", href: "/app/analytics", icon: BarChart3 },
  { name: "Logs", href: "/app/logs", icon: FileText },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

interface SystemStatus {
  status: "operational" | "degraded";
  uptimePercentage: number;
  message: string;
}

export function AppSidebar() {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "operational",
    uptimePercentage: 100,
    message: "All systems operational",
  });

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await api("/system-status");
        if (response?.success && response?.data) {
          setSystemStatus({
            ...response.data,
            uptimePercentage: Number(response.data.uptimePercentage) || 100,
          });
        }
      } catch (error) {
        console.error("Failed to fetch system status:", error);
      }
    };

    fetchSystemStatus();
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-border bg-card text-card-foreground flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold text-foreground">RateGuard</div>
          <div className="text-xs text-muted-foreground">API protection</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/app"}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-4 mt-auto">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className={`h-2 w-2 rounded-full ${
                systemStatus.status === "operational" 
                  ? "bg-success animate-pulse" 
                  : "bg-warning"
              }`} 
            />
            <span 
              className={`text-xs font-medium ${
                systemStatus.status === "operational" 
                  ? "text-success" 
                  : "text-warning"
              }`}
            >
              {systemStatus.message}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {systemStatus.uptimePercentage.toFixed(2)}% uptime this month
          </p>
        </div>
      </div>
    </aside>
  );
}
