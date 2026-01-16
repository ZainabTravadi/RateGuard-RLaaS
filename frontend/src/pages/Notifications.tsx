import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Mail, Clock } from "lucide-react";
import api from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  payload: {
    invite_id?: string;
    workspace_id?: string;
    workspace_name?: string;
    invited_by_email?: string;
    role?: string;
  };
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api("/notifications");
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const response = await api(`/invites/${inviteId}/accept`, {
        method: "POST",
      });

      if (response.success) {
        const acceptedWorkspaceId = response.data?.workspace_id;
        // Remove notification from list
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (acceptedWorkspaceId) {
          localStorage.setItem("workspaceId", acceptedWorkspaceId);
        }
        // Reload page to update workspace context
        window.location.href = "/app";
      }
    } catch (err: any) {
      alert(err.message || "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectInvite = async (inviteId: string, notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const response = await api(`/invites/${inviteId}/reject`, {
        method: "POST",
      });

      if (response.success) {
        // Remove notification from list
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (err: any) {
      alert(err.message || "Failed to reject invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await api(`/notifications/${notificationId}`, {
        method: "DELETE",
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const switchWorkspace = (workspaceId?: string) => {
    if (workspaceId) {
      localStorage.setItem("workspaceId", workspaceId);
    } else {
      localStorage.removeItem("workspaceId");
    }
    window.location.href = "/app";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-muted rounded w-1/4"></div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Manage your team invitations and notifications
        </p>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No notifications
              </h3>
              <p className="text-sm text-muted-foreground">
                You're all caught up! Check back later for updates.
              </p>
            </div>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${
                !notification.is_read ? "border-primary/50 bg-primary/5" : ""
              }`}
            >
              {notification.type === "workspace_invite" && (
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          Workspace Invitation
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium text-foreground">
                            {notification.payload.invited_by_email}
                          </span>{" "}
                          invited you to join{" "}
                          <span className="font-medium text-foreground">
                            {notification.payload.workspace_name}
                          </span>{" "}
                          as a{" "}
                          <span
                            className={`font-medium ${
                              notification.payload.role === "admin"
                                ? "text-primary"
                                : "text-warning"
                            }`}
                          >
                            {notification.payload.role}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAcceptInvite(
                            notification.payload.invite_id!,
                            notification.id
                          )
                        }
                        disabled={processingId === notification.id}
                        className="bg-success hover:bg-success/90"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRejectInvite(
                            notification.payload.invite_id!,
                            notification.id
                          )
                        }
                        disabled={processingId === notification.id}
                        className="border-border hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {notification.type === "invite_accepted" && (
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 border border-success/20 flex-shrink-0">
                        <Check className="h-6 w-6 text-success" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          Welcome to {notification.payload.workspace_name}!
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          You now have access to this workspace as a{" "}
                          <span className="font-medium text-foreground">
                            {notification.payload.role}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => switchWorkspace()}
                      >
                        Stop simulation
                      </Button>
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90"
                        onClick={() =>
                          switchWorkspace(notification.payload.workspace_id)
                        }
                        disabled={!notification.payload.workspace_id}
                      >
                        Go to workspace
                      </Button>
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
