import { signup, login, me } from "./auth.controller.js";
import { requireAuth } from "./auth.guard.js";

export async function authRoutes(app) {
  // ❌ NO AUTH GUARD HERE
  app.post("/auth/signup", signup);
  app.post("/auth/login", login);

  // ✅ Guard ONLY here
  app.get("/auth/me", { preHandler: requireAuth }, me);
}
