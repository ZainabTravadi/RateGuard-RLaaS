import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Info, Plus, Shield, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getApiBaseUrl } from "@/lib/apiBase";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = getApiBaseUrl();

interface Rule {
  id: string;
  name: string;
  description: string;
  limit: number;
  window: string;
  scope: "global" | "service" | "endpoint";
  endpoint: string | null;
  enabled: boolean;
  tooltip: string;
}

const windowOptions = [
  { value: "1s", label: "1 second", seconds: 1 },
  { value: "10s", label: "10 seconds", seconds: 10 },
  { value: "1m", label: "1 minute", seconds: 60 },
  { value: "5m", label: "5 minutes", seconds: 300 },
  { value: "1h", label: "1 hour", seconds: 3600 }
];

const scopeOptions = [
  { value: "global", label: "Global" },
  { value: "service", label: "Per Service" },
  { value: "endpoint", label: "Per Endpoint" }
];

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    limit: 100,
    window: "1m",
    scope: "global" as "global" | "service" | "endpoint",
    endpoint: ""
  });

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  });

  // 🔐 ENVIRONMENT — MUST BE UUID
  const environmentId = localStorage.getItem("environmentId");

if (!environmentId) {
  console.error("Missing environmentId");
}


  // =============================
  // READ
  // =============================
  useEffect(() => {
    if (!environmentId) {
      console.error("Missing environmentId");
      setLoading(false);
      return;
    }

    const loadRules = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/rules?environmentId=${environmentId}`,
          { headers: authHeaders() }
        );

        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("Rules API did not return array:", data);
          setRules([]);
          return;
        }

        setRules(
          data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            limit: r.limit_count,
            window:
              windowOptions.find(w => w.seconds === r.window_seconds)?.value ??
              "1m",
            scope: r.scope,
            endpoint: r.endpoint,
            enabled: r.enabled,
            tooltip: r.description
          }))
        );
      } catch (err) {
        console.error("Failed to load rules:", err);
        setRules([]);
      } finally {
        setLoading(false);
      }
    };

    loadRules();
  }, [environmentId]);

  // =============================
  // TOGGLE — OPTIMISTIC
  // =============================
  const toggleRule = async (id: string) => {
  let nextEnabled: boolean;
  setProcessingId(id);

  setRules(prev =>
    prev.map(r => {
      if (r.id === id) {
        nextEnabled = !r.enabled;
        return { ...r, enabled: nextEnabled };
      }
      return r;
    })
  );

  try {
    await fetch(
      `${API_BASE}/rules/${id}/toggle?environmentId=${environmentId}`,
      { method: "PATCH", headers: authHeaders() }
    );
  } catch {
    // rollback ONLY on failure
    setRules(prev =>
      prev.map(r =>
        r.id === id ? { ...r, enabled: !nextEnabled } : r
      )
    );
  } finally {
    setProcessingId(null);
  }
};


  // =============================
  // DELETE
  // =============================
  const deleteRule = async (id: string) => {
  if (!environmentId || environmentId === "null") {
    alert("Environment not selected. Refresh.");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/rules/${id}?environmentId=${encodeURIComponent(environmentId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // ❗ NO content-type
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Delete failed:", res.status, text);
      return;
    }

    setRules(prev => prev.filter(r => r.id !== id));
  } catch (err) {
    console.error(err);
  }
};



  // =============================
  // CREATE
  // =============================
  const createRule = async () => {
    setCreateLoading(true);
    if (newRule.scope === "endpoint" && !newRule.endpoint.trim()) {
  alert("Endpoint is required for endpoint-scoped rules");
    setCreateLoading(false);
  return;
}

    const windowSeconds =
      windowOptions.find(w => w.value === newRule.window)?.seconds ?? 60;

    const res = await fetch(
      `${API_BASE}/rules?environmentId=${environmentId}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          environmentId,
          name: newRule.name || "Custom Rule",
          description: newRule.description || "",
          scope: newRule.scope,
          endpoint:
            newRule.scope === "endpoint"
              ? newRule.endpoint
              : null,
          limit: newRule.limit,
          windowSeconds,
          enabled: true
        })
      }
    );

    const rule = await res.json();

    setRules(prev => [
      {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        limit: rule.limit_count,
        window: newRule.window,
        scope: rule.scope,
        endpoint: rule.endpoint,
        enabled: rule.enabled,
        tooltip: rule.description
      },
      ...prev
    ]);

    setShowCreateModal(false);
    setCreateLoading(false);
    setNewRule({
      name: "",
      description: "",
      limit: 100,
      window: "1m",
      scope: "global",
      endpoint: ""
    });
  };

  // =============================
  // UPDATE
  // =============================
  const updateRule = async (id: string, updates: Partial<Rule>) => {
    let updated: Rule | null = null;

    setRules(prev =>
      prev.map(r => {
        if (r.id === id) {
          updated = { ...r, ...updates };
          return updated;
        }
        return r;
      })
    );

    if (!updated) return;

    const windowSeconds =
      windowOptions.find(w => w.value === updated.window)?.seconds ?? 60;

    await fetch(
      `${API_BASE}/rules/${id}?environmentId=${environmentId}`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          limit: updated.limit,
          scope: updated.scope,
          endpoint:
            updated.scope === "endpoint"
              ? updated.endpoint
              : null, // 🔥 clear endpoint if scope changes
          windowSeconds
        })
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rules & Policies</h1>
            <p className="text-muted-foreground mt-1">Configure rate limiting rules for your applications</p>
          </div>
          <div>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border">
              <Skeleton className="h-6 w-1/3 mb-3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
   return (
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Rules & Policies
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure rate limiting rules for your applications
            </p>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <Card
             key={rule.id}
  className={`transition-all duration-200 ${
  rule.enabled
    ? "opacity-100"
    : "opacity-60 bg-muted/30"
}`}
>

              {/* Top */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                      rule.enabled
                        ? "bg-primary/10 border-primary/20"
                        : "bg-muted border-border"
                    }`}
                  >
                    <Shield
                      className={`h-5 w-5 ${
                        rule.enabled
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {rule.name}
                      </h3>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{rule.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                          disabled={processingId === rule.id}
                        />
                  <Button
                    variant="ghost"
                    size="icon"
                          onClick={() => deleteRule(rule.id)}
                          disabled={processingId === rule.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Limit
                  </label>
                  <Input
                    type="number"
                    value={rule.limit}
                    onChange={e =>
                      updateRule(rule.id, {
                        limit: Number(e.target.value)
                      })
                    }
                    disabled={!rule.enabled}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Time Window
                  </label>
                  <Select
                    value={rule.window}
                    onValueChange={value =>
                      updateRule(rule.id, { window: value })
                    }
                    disabled={!rule.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {windowOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Scope
                  </label>
                  <Select
                    value={rule.scope}
                    onValueChange={value =>
                      updateRule(rule.id, { scope: value as any })
                    }
                    disabled={!rule.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 🔥 Endpoint binding UI — ADD THIS HERE */}
{rule.scope === "endpoint" && (
  <div className="mt-4">
    <label className="text-xs font-medium text-muted-foreground">
      Endpoint
    </label>
    <Input
  placeholder="/api/login"
  value={rule.endpoint ?? ""}
  onChange={e =>
    setRules(prev =>
      prev.map(r =>
        r.id === rule.id
          ? { ...r, endpoint: e.target.value }
          : r
      )
    )
  }
  onBlur={() =>
    updateRule(rule.id, { endpoint: rule.endpoint })
  }
  disabled={!rule.enabled}
/>

  </div>
)}

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <span
  className={`opacity-100 text-xs px-2.5 py-0.5 rounded-full border font-medium ${
    rule.enabled
      ? "border-green-500/40 bg-green-500/10 text-green-600"
      : "border-red-500/40 bg-red-500/10 text-red-600"
  }`}
>
  {rule.enabled ? "Active" : "Disabled"}
</span>


                <span className="text-xs text-muted-foreground">
                  {rule.limit} requests /{" "}
                  {
                    windowOptions.find(w => w.value === rule.window)
                      ?.label
                  }
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* CREATE RULE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-lg p-6">
              <h2 className="text-lg font-semibold mb-4">
                Create Custom Rule
              </h2>

              <div className="space-y-4">
                <Input
                  placeholder="Rule Name"
                  value={newRule.name}
                  onChange={e =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                />

                <Input
                  placeholder="Description"
                  value={newRule.description}
                  onChange={e =>
                    setNewRule({
                      ...newRule,
                      description: e.target.value
                    })
                  }
                />

                <Input
                  type="number"
                  placeholder="Limit"
                  value={newRule.limit}
                  onChange={e =>
                    setNewRule({
                      ...newRule,
                      limit: Number(e.target.value)
                    })
                  }
                />

                <Select
                  value={newRule.window}
                  onValueChange={v =>
                    setNewRule({ ...newRule, window: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {windowOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newRule.scope}
                  onValueChange={v =>
                    setNewRule({ ...newRule, scope: v as any })
                  }
                >
                  {/* 🔥 Endpoint input (only when scope = endpoint) */}
{newRule.scope === "endpoint" && (
  <div>
    <label className="text-xs font-medium text-muted-foreground">
      Endpoint
    </label>
    <Input
      placeholder="/api/login"
      value={newRule.endpoint}
      onChange={e =>
        setNewRule({ ...newRule, endpoint: e.target.value })
      }
    />
    <p className="text-xs text-muted-foreground mt-1">
      Must match the exact request path (e.g. /api/login)
    </p>
  </div>
)}

                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createRule} disabled={createLoading}>
                  {createLoading ? "Creating…" : "Create Rule"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
      
    );
}
