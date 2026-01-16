// src/routes/external.routes.js
import { apiKeyGuard } from "../middleware/apiKey.guard.js";
import { apiKeyAuditHook } from "../middleware/apiKeyAudit.hook.js";
import { enforcementGuard } from "../modules/enforcement/enforcement.guard.js";
import { enforcementRoutes } from "../modules/enforcement/enforcement.routes.js";

export default async function externalApiRoutes(app) {
  app.register(async function scoped(app) {
    app.addHook("preHandler", apiKeyGuard);
    app.addHook("preHandler", enforcementGuard);
    app.addHook("onSend", apiKeyAuditHook);

    // ONLY external endpoints here
    app.get("/v1/health", async () => {
      return { ok: true };
    });
    
    // SDK-facing rate limit check endpoint
    await app.register(enforcementRoutes);
  });
}
