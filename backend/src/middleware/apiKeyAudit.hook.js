import { logApiUsage } from "../modules/audit/audit.service.js";

export async function apiKeyAuditHook(req, reply) {
  if (!req.apiKey) return;

  reply.raw.on("finish", async () => {
    const responseStatusCode = reply.statusCode || reply.raw.statusCode || 200;
    const decisionStatusCode = req.rateLimit?.allowed === false ? 429 : responseStatusCode;
    const auditedMethod = req.analyticsRequest?.method || req.method;
    const auditedEndpoint = req.analyticsRequest?.endpoint || req.routerPath || req.url;

    try {
      await logApiUsage({
        apiKeyId: req.apiKey.id,
        userId: req.apiKey.userId,
        ruleId: req.rateLimit?.ruleId ?? null,
        method: auditedMethod,
        endpoint: auditedEndpoint,
        statusCode: decisionStatusCode,
        ip: req.ip,
      });
    } catch (error) {
      req.log.error({ err: error, requestId: req.id }, "audit log failed");
    }
  });
}

