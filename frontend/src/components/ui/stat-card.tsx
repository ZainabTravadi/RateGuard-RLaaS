import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor = "text-primary" }: StatCardProps) {
  const changeColors = {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="stat-card group animate-fade-in">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 ${iconColor} transition-transform group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: "healthy" | "warning" | "critical";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    healthy: { label: "Healthy", className: "status-allowed" },
    warning: { label: "Warning", className: "status-warning" },
    critical: { label: "Critical", className: "status-blocked" },
  };

  const config = statusConfig[status];

  return (
    <span className={`badge-pill border ${config.className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
        status === "healthy" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-danger"
      } animate-pulse`} />
      {config.label}
    </span>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", padding = true, style }: CardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card ${padding ? "p-6" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground mt-1">
      {children}
    </p>
  );
}
