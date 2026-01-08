import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Webhook, Plus, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  channels: ("email" | "webhook")[];
}

interface AlertHistoryItem {
  id: string;
  ruleName: string;
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  resolved: boolean;
}

const initialAlertRules: AlertRule[] = [
  { id: "1", name: "High Traffic Alert", condition: "usage", threshold: 80, enabled: true, channels: ["email"] },
  { id: "2", name: "Rate Limit Threshold", condition: "blocked", threshold: 5, enabled: true, channels: ["email", "webhook"] },
  { id: "3", name: "Service Degradation", condition: "latency", threshold: 200, enabled: false, channels: ["webhook"] },
];

const alertHistory: AlertHistoryItem[] = [
  { id: "1", ruleName: "High Traffic Alert", message: "Traffic exceeded 80% of capacity on /api/users", timestamp: "10 min ago", severity: "warning", resolved: true },
  { id: "2", ruleName: "Rate Limit Threshold", message: "5% of requests blocked in the last hour", timestamp: "1 hour ago", severity: "warning", resolved: true },
  { id: "3", ruleName: "High Traffic Alert", message: "Traffic spike detected on /api/auth", timestamp: "3 hours ago", severity: "critical", resolved: true },
  { id: "4", ruleName: "Rate Limit Threshold", message: "Unusual blocking pattern from IP 192.168.1.45", timestamp: "5 hours ago", severity: "info", resolved: true },
];

export default function AlertsPage() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(initialAlertRules);

  const toggleAlert = (id: string) => {
    setAlertRules(alertRules.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const toggleChannel = (id: string, channel: "email" | "webhook") => {
    setAlertRules(alertRules.map(rule => {
      if (rule.id !== id) return rule;
      const hasChannel = rule.channels.includes(channel);
      return {
        ...rule,
        channels: hasChannel 
          ? rule.channels.filter(c => c !== channel)
          : [...rule.channels, channel]
      };
    }));
  };

  const getSeverityStyles = (severity: AlertHistoryItem["severity"]) => {
    const styles = {
      info: { icon: CheckCircle, className: "text-primary bg-primary/10 border-primary/20" },
      warning: { icon: AlertTriangle, className: "text-warning bg-warning/10 border-warning/20" },
      critical: { icon: AlertTriangle, className: "text-danger bg-danger/10 border-danger/20" },
    };
    return styles[severity];
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Configure alert rules and view alert history
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Alert Rule
          </Button>
        </div>

        {/* Alert Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Rules</CardTitle>
            <CardDescription>Configure when and how you want to be notified</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {alertRules.map((rule, index) => (
              <div 
                key={rule.id} 
                className={`p-4 rounded-lg border border-border bg-muted/30 transition-all duration-300 animate-fade-in ${!rule.enabled ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${rule.enabled ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'} border`}>
                      <Bell className={`h-5 w-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Trigger when {rule.condition} exceeds {rule.threshold}{rule.condition === "latency" ? "ms" : "%"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleAlert(rule.id)}
                  />
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Notify via:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChannel(rule.id, "email")}
                    className={`${rule.channels.includes("email") ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"} border`}
                    disabled={!rule.enabled}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChannel(rule.id, "webhook")}
                    className={`${rule.channels.includes("webhook") ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"} border`}
                    disabled={!rule.enabled}
                  >
                    <Webhook className="h-4 w-4 mr-2" />
                    Webhook
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Notification Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Receive alerts via email</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Input
              type="email"
              placeholder="team@company.com"
              defaultValue="alerts@yourcompany.com"
              className="bg-muted/50 border-border focus:border-primary"
            />
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Webhook className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Webhook URL</CardTitle>
                  <CardDescription>Send alerts to your webhook endpoint</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Input
              type="url"
              placeholder="https://your-webhook-url.com/alerts"
              defaultValue="https://api.yourapp.com/webhooks/alerts"
              className="bg-muted/50 border-border focus:border-primary font-mono text-sm"
            />
          </Card>
        </div>

        {/* Alert History */}
        <Card>
          <CardHeader>
            <CardTitle>Alert History</CardTitle>
            <CardDescription>Recent alerts and their resolution status</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {alertHistory.map((alert, index) => {
              const severityConfig = getSeverityStyles(alert.severity);
              const Icon = severityConfig.icon;
              return (
                <div 
                  key={alert.id} 
                  className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/20 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${severityConfig.className}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-sm">{alert.ruleName}</span>
                      {alert.resolved && (
                        <span className="badge-pill border status-allowed text-xs">Resolved</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">{alert.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
