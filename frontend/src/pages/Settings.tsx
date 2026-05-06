import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

/* ===================== TYPES ===================== */

interface ApiKey {
  id: string;
  name: string;
  environment: "production" | "development";
  keyPrefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface DisplayKey extends ApiKey {
  fullKey?: string;
}

interface Environment {
  id: string;
  name: "production" | "development";
  base_url: string;
  is_active: boolean;
}

/* ===================== PAGE ===================== */

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<DisplayKey[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [generateLoading, setGenerateLoading] = useState<boolean>(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  /* ===================== FETCH ===================== */

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    fetchEnvironments();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await api("/api-keys");
      setApiKeys(data || []);
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const data = await api("/environments");
      setEnvironments(data || []);
    } catch (err) {
      console.error("Failed to fetch environments:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== API KEYS ===================== */

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getMaskedKey = (key: DisplayKey) => {
    if (key.fullKey && visibleKeys.has(key.id)) return key.fullKey;
    return `${key.keyPrefix}••••••••••••••••••••`;
  };

  const generateKey = async () => {
    try {
      setGenerateLoading(true);
      const res = await api("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "New API Key", environment: "production" }),
      });

      setApiKeys(prev => [
        {
          ...res.meta,
          keyPrefix: res.apiKey.slice(0, 8),
          fullKey: res.apiKey,
        },
        ...prev,
      ]);
      setLastGeneratedId(res.meta?.id || null);
    } catch (err) {
      console.error("Failed to generate key:", err);
      alert("Failed to generate API key");
    } finally {
      setGenerateLoading(false);
    }
  };

  const rotateKey = async (id: string) => {
    try {
      setRotatingId(id);
      const res = await api(`/api-keys/${id}/rotate`, { method: "POST" });

      setApiKeys(prev =>
        prev.map(k =>
          k.id === id
            ? { ...k, fullKey: res.apiKey, keyPrefix: res.apiKey.slice(0, 8) }
            : k
        )
      );

      setVisibleKeys(prev => new Set(prev).add(id));
    } catch (err) {
      console.error("Failed to rotate key:", err);
      alert("Failed to rotate API key");
    } finally {
      setRotatingId(null);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      setDeletingId(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      await api(`/api-keys/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete key:", err);
      alert("Failed to delete API key");
    } finally {
      setDeletingId(null);
    }
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys, environments, and account settings
        </p>
      </div>
      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage your API keys for different environments
                </CardDescription>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90" onClick={generateKey} disabled={generateLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {generateLoading ? "Generating..." : "Generate New Key"}
            </Button>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : apiKeys.length > 0 ? (
            apiKeys.map((apiKey, index) => (
              <div
                key={apiKey.id}
                className="p-4 rounded-lg border border-border bg-muted/30 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {apiKey.name}
                  </span>
                  <span
                    className={`badge-pill border ${
                      apiKey.environment === "production"
                        ? "status-allowed"
                        : "status-warning"
                    }`}
                  >
                    {apiKey.environment}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => rotateKey(apiKey.id)}
                    disabled={rotatingId === apiKey.id}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {rotatingId === apiKey.id ? "Rotating..." : "Rotate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteKey(apiKey.id)}
                    disabled={deletingId === apiKey.id}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-muted-foreground">
                  {getMaskedKey(apiKey)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleKeyVisibility(apiKey.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {visibleKeys.has(apiKey.id) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {apiKey.fullKey && apiKey.id === lastGeneratedId && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Copy this API key now, it will not be shown again.
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Created: {new Date(apiKey.created_at).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>
                  Last used:{" "}
                  {apiKey.last_used_at
                    ? new Date(apiKey.last_used_at).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-1">No API keys yet.</p>
          )}
        </div>
      </Card>

      {/* ENVIRONMENT MANAGEMENT */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Environment Management</CardTitle>
              <CardDescription>
                Configure settings for different environments
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {environments.map(env => (
            <div
              key={env.id}
              className="p-4 rounded-lg border border-border bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    env.is_active ? "bg-success" : "bg-danger"
                  }`}
                />
                <span className="font-medium text-foreground capitalize">
                  {env.name}
                </span>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingEnv(env)}
                >
                  Edit
                </Button>

                <p>
                  Base URL:{" "}
                  <code className="text-primary">{env.base_url}</code>
                </p>
                <p>Status: {env.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editingEnv && (
        <EditEnvironmentModal
          env={editingEnv}
          onClose={() => setEditingEnv(null)}
          onSave={updatedEnv => {
            setEnvironments(prev =>
              prev.map(e => (e.id === updatedEnv.id ? updatedEnv : e))
            );
          }}
        />
      )}
    </div>
  );
}

/* ===================== MODALS ===================== */

function EditEnvironmentModal({
  env,
  onClose,
  onSave,
}: {
  env: Environment;
  onClose: () => void;
  onSave: (env: Environment) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(env.base_url);
  const [isActive, setIsActive] = useState(env.is_active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    await api(`/environments/${env.id}`, {
      method: "PATCH",
      body: JSON.stringify({ base_url: baseUrl, is_active: isActive }),
    });

    onSave({ ...env, base_url: baseUrl, is_active: isActive });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-background rounded-lg border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">
          Edit {env.name} Environment
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Base URL</label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
