import { logApiUsage } from "../modules/audit/audit.service.js";

export async function apiKeyAuditHook(req, reply) {
  if (!req.apiKey) return;

  const start = Date.now();

  reply.raw.on("finish", async () => {
    await logApiUsage({
      apiKeyId: req.apiKey.id,
      userId: req.apiKey.userId,
      ruleId: req.rateLimit?.ruleId ?? null,
      method: req.method,
      endpoint: req.routerPath || req.url,
      statusCode: reply.statusCode,
      ip: req.ip,
    });
  });
}
