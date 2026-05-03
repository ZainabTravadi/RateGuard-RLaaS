import { signup, login, me, forgotPassword, verifyOTP, resetPassword } from "./auth.controller.js";
import { requireAuth } from "./auth.guard.js";
import { validateBody } from "../../middleware/requestValidation.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "./auth.schema.js";
import { createRouteRateLimitGuard } from "../../middleware/routeRateLimit.guard.js";

const signupThrottle = createRouteRateLimitGuard({
  routeId: "auth:signup",
  limitCount: 5,
  windowSeconds: 60,
});

const loginThrottle = createRouteRateLimitGuard({
  routeId: "auth:login",
  limitCount: 5,
  windowSeconds: 60,
});

const forgotPasswordThrottle = createRouteRateLimitGuard({
  routeId: "auth:forgot-password",
  limitCount: 3,
  windowSeconds: 60,
});

const verifyOtpThrottle = createRouteRateLimitGuard({
  routeId: "auth:verify-otp",
  limitCount: 3,
  windowSeconds: 60,
});

const resetPasswordThrottle = createRouteRateLimitGuard({
  routeId: "auth:reset-password",
  limitCount: 3,
  windowSeconds: 60,
});

export async function authRoutes(app) {
  // Public endpoints
  app.post("/auth/signup", { preHandler: [signupThrottle, validateBody(signupSchema)] }, signup);
  app.post("/auth/login", { preHandler: [loginThrottle, validateBody(loginSchema)] }, login);
  app.post("/auth/forgot-password", { preHandler: [forgotPasswordThrottle, validateBody(forgotPasswordSchema)] }, forgotPassword);
  app.post("/auth/verify-otp", { preHandler: [verifyOtpThrottle, validateBody(verifyOtpSchema)] }, verifyOTP);
  app.post("/auth/reset-password", { preHandler: [resetPasswordThrottle, validateBody(resetPasswordSchema)] }, resetPassword);

  // Protected endpoints
  app.get("/auth/me", { preHandler: requireAuth }, me);
}
