// src/modules/gateway/gateway.routes.js
import { apiKeyGuard } from "../../middleware/apiKey.guard.js";
import { apiKeyAuditHook } from "../../middleware/apiKeyAudit.hook.js";
import { enforcementGuard } from "../enforcement/enforcement.guard.js";
import { handleGatewayRequest } from "./gateway.controller.js";

export default async function gatewayRoutes(app) {
  // 🔐 API key auth
  app.addHook("preHandler", apiKeyGuard);

  // 🚦 Rate limit enforcement
  app.addHook("preHandler", enforcementGuard);

  // 🧾 Audit logging (after response)
  app.addHook("onSend", apiKeyAuditHook);

  /**
   * 🔥 Gateway proxy
   * Example:
   *   POST /proxy/production/api/pdf-to-txt
   */
  app.all("/proxy/:environment/*", handleGatewayRequest);
}
