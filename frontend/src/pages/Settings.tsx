import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, RefreshCw, Eye, EyeOff, Plus, Trash2, Users, Settings as SettingsIcon, Globe } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  environment: "production" | "development";
  createdAt: string;
  lastUsed: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  avatar: string;
}

const mockApiKeys: ApiKey[] = [
  { id: "1", name: "Production Key", key: "rg_live_xxxxxxxxxxxxxxxxxxxxxxxx", environment: "production", createdAt: "Jan 1, 2024", lastUsed: "2 min ago" },
  { id: "2", name: "Development Key", key: "rg_test_yyyyyyyyyyyyyyyyyyyyyyyy", environment: "development", createdAt: "Jan 5, 2024", lastUsed: "1 hour ago" },
];

const mockTeamMembers: TeamMember[] = [
  { id: "1", name: "John Doe", email: "john@company.com", role: "admin", avatar: "JD" },
  { id: "2", name: "Jane Smith", email: "jane@company.com", role: "admin", avatar: "JS" },
  { id: "3", name: "Bob Wilson", email: "bob@company.com", role: "viewer", avatar: "BW" },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getMaskedKey = (key: string, id: string) => {
    if (visibleKeys.has(id)) {
      return key;
    }
    return key.substring(0, 8) + "••••••••••••••••••••";
  };

  const updateMemberRole = (id: string, role: "admin" | "viewer") => {
    setTeamMembers(teamMembers.map(member =>
      member.id === id ? { ...member, role } : member
    ));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys, team members, and account settings
          </p>
        </div>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for different environments</CardDescription>
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
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
                    <span className="font-medium text-foreground">{apiKey.name}</span>
                    <span className={`badge-pill border ${apiKey.environment === "production" ? "status-allowed" : "status-warning"}`}>
                      {apiKey.environment}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rotate
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-muted-foreground">
                    {getMaskedKey(apiKey.key, apiKey.id)}
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
                  <span>Created: {apiKey.createdAt}</span>
                  <span>•</span>
                  <span>Last used: {apiKey.lastUsed}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Environment Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Environment Management</CardTitle>
                <CardDescription>Configure settings for different environments</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="font-medium text-foreground">Production</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Base URL: <code className="text-primary">api.rateguard.io</code></p>
                <p>Region: US East (N. Virginia)</p>
                <p>Status: Active</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span className="font-medium text-foreground">Development</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Base URL: <code className="text-primary">dev.rateguard.io</code></p>
                <p>Region: US East (N. Virginia)</p>
                <p>Status: Active</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Team Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage team access and roles</CardDescription>
                </div>
              </div>
              <Button variant="outline" className="border-border hover:bg-muted">
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </CardHeader>
          
          <div className="space-y-3">
            {teamMembers.map((member, index) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select 
                    value={member.role} 
                    onValueChange={(value: "admin" | "viewer") => updateMemberRole(member.id, value)}
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
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
