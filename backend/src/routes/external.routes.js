import { apiKeyGuard } from "../middleware/apiKey.guard.js";
import { apiKeyAuditHook } from "../middleware/apiKeyAudit.hook.js";

export default async function externalApiRoutes(app) {
  // Authenticate machine-to-machine traffic
  app.addHook("preHandler", apiKeyGuard);

  // Log every successful API key request
  app.addHook("onRequest", apiKeyAuditHook);

  // Test endpoint
  app.get("/v1/health", async () => {
    return { ok: true };
  });

  // 🔜 Future:
  // - rate limiting
  // - rule evaluation
  // - analytics
}
