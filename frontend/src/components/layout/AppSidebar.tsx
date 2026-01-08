import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plug,
  Shield,
  BarChart3,
  FileText,
  Bell,
  Settings,
  Zap,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Rules & Policies", href: "/rules", icon: Shield },
  { name: "Traffic Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Logs", href: "/logs", icon: FileText },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <span className="text-lg font-semibold text-foreground">RateGuard</span>
          <span className="ml-1 text-xs text-muted-foreground">Pro</span>
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
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">All systems operational</span>
          </div>
          <p className="text-xs text-muted-foreground">
            99.99% uptime this month
          </p>
        </div>
      </div>
    </aside>
  );
}
