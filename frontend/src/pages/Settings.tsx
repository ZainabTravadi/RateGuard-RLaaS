import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Users,
  Globe,
} from "lucide-react";
import api from "@/lib/api";

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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  avatar: string;
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

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  /* ===================== FETCH ===================== */

  useEffect(() => {
    api("/api-keys").then(setApiKeys);
  }, []);

  useEffect(() => {
    api("/environments").then(setEnvironments);
  }, []);

  useEffect(() => {
    api("/team/members").then(setTeamMembers);
  }, []);

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
  };

  const rotateKey = async (id: string) => {
    const res = await api(`/api-keys/${id}/rotate`, { method: "POST" });

    setApiKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, fullKey: res.apiKey, keyPrefix: res.apiKey.slice(0, 8) }
          : k
      )
    );

    setVisibleKeys(prev => new Set(prev).add(id));
  };

  const deleteKey = async (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    await api(`/api-keys/${id}`, { method: "DELETE" });
  };

  /* ===================== TEAM ===================== */

  const updateMemberRole = async (id: string, role: "admin" | "viewer") => {
    setTeamMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, role } : m))
    );

    await api(`/team/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  };

  const removeMember = async (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    await api(`/team/members/${id}`, { method: "DELETE" });
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys, team members, and account settings
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
            <Button className="bg-primary hover:bg-primary/90" onClick={generateKey}>
              <Plus className="h-4 w-4 mr-2" />
              Generate New Key
            </Button>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {apiKeys.map((apiKey, index) => (
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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rotate
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteKey(apiKey.id)}
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
          ))}
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

      {/* TEAM MEMBERS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage team access and roles
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-border hover:bg-muted"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {teamMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                  {member.avatar || member.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={member.role}
                  onValueChange={(value: "admin" | "viewer") =>
                    updateMemberRole(member.id, value)
                  }
                >
                  <SelectTrigger className="w-28 bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember(member.id)}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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

      {inviteOpen && (
        <InviteMemberModal
          onClose={() => setInviteOpen(false)}
          onInvited={member => {
            setTeamMembers(prev => [...prev, member]);
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

function InviteMemberModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (member: TeamMember) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);

    const member = await api("/team/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });

    onInvited(member);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-background rounded-lg border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">
          Invite Team Member
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <Select
              value={role}
              onValueChange={(v: "admin" | "viewer") => setRole(v)}
            >
              <SelectTrigger className="mt-1 bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            Invite
          </Button>
        </div>
      </div>
    </div>
  );
}
