import { useState } from "react";
import { Bell, ChevronDown, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const [environment, setEnvironment] = useState<"production" | "development">("production");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-border bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Environment Selector */}
        <button
          onClick={() => setEnvironment(environment === "production" ? "development" : "production")}
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          <div className={`h-2 w-2 rounded-full ${environment === "production" ? "bg-success" : "bg-warning"}`} />
          <span className="font-medium capitalize">{environment}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-danger-foreground">
            3
          </span>
        </Button>

        {/* User */}
        <button className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-1.5 transition-colors hover:bg-muted">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">John Doe</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
