import { ReactNode, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // 🔐 Auth guard (MVP)
  

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-[0.02] pointer-events-none" />

      <AppSidebar />
      <div className="pl-64">
        <AppHeader />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
