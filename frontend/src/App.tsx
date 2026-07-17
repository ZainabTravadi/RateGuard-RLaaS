import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";

const LandingPage = lazy(() => import("./pages/Landing"));
const Overview = lazy(() => import("./pages/Overview"));
const Integrations = lazy(() => import("./pages/Integrations"));
const NodeIntegration = lazy(() => import("./pages/NodeIntegration"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const Rules = lazy(() => import("./pages/Rules"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Logs = lazy(() => import("./pages/Logs"));
const DocsPage = lazy(() => import("./pages/Docs"));
const Settings = lazy(() => import("./pages/Settings"));
const LoginPage = lazy(() => import("./pages/login"));
const SignupPage = lazy(() => import("./pages/signup"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <AuthProvider>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
                  Loading RateGuard...
                </div>
              }
            >
              <Routes>

                {/* PUBLIC ROUTES */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* PROTECTED APP ROUTES */}
                <Route
                  path="/app"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Overview />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/dashboard"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Overview />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/rules"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Rules />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/integrations"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Integrations />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/integrations/nodejs"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <NodeIntegration />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/integrations/coming-soon"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <ComingSoon />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/analytics"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Analytics />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/logs"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Logs />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app/settings"
                  element={
                    <RequireAuth>
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
}
