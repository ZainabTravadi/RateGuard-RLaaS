import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";

import Overview from "./pages/Overview";
import Integrations from "./pages/Integrations";
import Rules from "./pages/Rules";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
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

              {/* PUBLIC */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* PROTECTED */}
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Overview />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/rules"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Rules />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/integrations"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Integrations />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/analytics"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Analytics />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/logs"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Logs />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/alerts"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Alerts />
                    </AppLayout>
                  </RequireAuth>
                }
              />

              <Route
                path="/settings"
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
