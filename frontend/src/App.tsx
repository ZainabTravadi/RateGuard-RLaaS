import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";

import LandingPage from "./pages/Landing";
import Overview from "./pages/Overview";
import Integrations from "./pages/Integrations";
import NodeIntegration from "./pages/NodeIntegration";
import ComingSoon from "./pages/ComingSoon";
import Rules from "./pages/Rules";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import DocsPage from "./pages/Docs";

import Settings from "./pages/Settings";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <AuthProvider>
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
          </AuthProvider>
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
}
