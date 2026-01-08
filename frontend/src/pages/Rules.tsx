import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Shield, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Rule {
  id: string;
  name: string;
  description: string;
  limit: number;
  window: string;
  scope: "global" | "service" | "endpoint";
  enabled: boolean;
  tooltip: string;
}

const initialRules: Rule[] = [
  {
    id: "1",
    name: "Requests per Minute",
    description: "Maximum requests allowed per minute",
    limit: 100,
    window: "1m",
    scope: "global",
    enabled: true,
    tooltip: "Limits the total number of requests per minute. Lower values provide better protection but may affect legitimate users."
  },
  {
    id: "2",
    name: "Requests per IP",
    description: "Maximum requests from a single IP address",
    limit: 50,
    window: "1m",
    scope: "endpoint",
    enabled: true,
    tooltip: "Prevents individual IPs from overwhelming your service. Useful for preventing DDoS attacks."
  },
  {
    id: "3",
    name: "Requests per User",
    description: "Maximum requests per authenticated user",
    limit: 200,
    window: "1m",
    scope: "global",
    enabled: true,
    tooltip: "Limits authenticated users. Higher than IP limits since users are verified."
  },
  {
    id: "4",
    name: "Burst Capacity",
    description: "Allow temporary burst above normal limits",
    limit: 150,
    window: "10s",
    scope: "service",
    enabled: false,
    tooltip: "Allows short bursts of traffic above normal limits. Useful for handling traffic spikes."
  }
];

const windowOptions = [
  { value: "1s", label: "1 second" },
  { value: "10s", label: "10 seconds" },
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "1h", label: "1 hour" },
];

const scopeOptions = [
  { value: "global", label: "Global" },
  { value: "service", label: "Per Service" },
  { value: "endpoint", label: "Per Endpoint" },
];

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(initialRules);

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rules & Policies</h1>
            <p className="text-muted-foreground mt-1">
              Configure rate limiting rules for your applications
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule, index) => (
            <Card 
              key={rule.id} 
              className={`animate-fade-in transition-all duration-300 ${!rule.enabled ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${rule.enabled ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'} border`}>
                    <Shield className={`h-5 w-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{rule.name}</h3>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-popover border-border">
                          <p className="text-sm">{rule.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-muted-foreground hover:text-danger"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Limit */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Limit
                  </label>
                  <Input
                    type="number"
                    value={rule.limit}
                    onChange={(e) => updateRule(rule.id, { limit: parseInt(e.target.value) })}
                    className="bg-muted/50 border-border focus:border-primary"
                    disabled={!rule.enabled}
                  />
                </div>

                {/* Time Window */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Time Window
                  </label>
                  <Select 
                    value={rule.window} 
                    onValueChange={(value) => updateRule(rule.id, { window: value })}
                    disabled={!rule.enabled}
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {windowOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Scope
                  </label>
                  <Select 
                    value={rule.scope} 
                    onValueChange={(value: "global" | "service" | "endpoint") => updateRule(rule.id, { scope: value })}
                    disabled={!rule.enabled}
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {scopeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className={`badge-pill border ${rule.enabled ? 'status-allowed' : 'bg-muted text-muted-foreground border-border'}`}>
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {rule.limit} requests / {windowOptions.find(w => w.value === rule.window)?.label}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State for adding new rules */}
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Create Custom Rule</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Define custom rate limiting rules tailored to your specific use case
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
