import { signup, login, me, forgotPassword, verifyOTP, resetPassword } from "./auth.controller.js";
import { requireAuth } from "./auth.guard.js";

export async function authRoutes(app) {
  // Public endpoints
  app.post("/auth/signup", signup);
  app.post("/auth/login", login);
  app.post("/auth/forgot-password", forgotPassword);
  app.post("/auth/verify-otp", verifyOTP);
  app.post("/auth/reset-password", resetPassword);

  // Protected endpoints
  app.get("/auth/me", { preHandler: requireAuth }, me);
}
