import { logApiUsage } from "../modules/audit/audit.service.js";

export async function apiKeyAuditHook(req, reply) {
  if (!req.apiKey) return;

  // Debug: Log audit hook invocation
  console.log(`[Audit Hook] Attached listener for ${req.method} ${req.url}, status=${reply.statusCode}`);

  reply.raw.on("finish", async () => {
    const responseStatusCode = reply.statusCode || reply.raw.statusCode || 200;
    const decisionStatusCode = req.rateLimit?.allowed === false ? 429 : responseStatusCode;
    const auditedMethod = req.analyticsRequest?.method || req.method;
    const auditedEndpoint = req.analyticsRequest?.endpoint || req.routerPath || req.url;

    console.log(`[Audit Hook] Writing log for ${auditedMethod} ${auditedEndpoint}, statusCode=${decisionStatusCode}, allowed=${decisionStatusCode !== 429}`);
    
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
      console.log(`[Audit Hook] ✓ Successfully logged audit entry`);
    } catch (err) {
      console.error(`[Audit Hook] ✗ Failed to log audit: ${err.message}`);
    }
  });
}
