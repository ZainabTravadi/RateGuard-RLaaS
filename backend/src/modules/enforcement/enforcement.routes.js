// src/modules/enforcement/enforcement.routes.js
import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluate as evaluateRateLimit } from "./rateLimit.service.js";

/**
 * SDK contract
 * POST /v1/check
 */
export async function enforcementRoutes(app) {
  app.post("/v1/check", async (req, reply) => {
    // 🔐 API key auth MUST be done before this route
    if (!req.apiKey) {
      return reply.code(401).send({ error: "API key required" });
    }

    const { identifier, endpoint, method } = req.body || {};

    if (!identifier || !endpoint || !method) {
      return reply.code(400).send({
        error: "identifier, endpoint, and method are required",
      });
    }

    const { userId, environment } = req.apiKey;

    // Resolve environment
    const environments = await getEnvironments(userId);
    const env = environments.find(
      (e) => e.name === environment && e.is_active
    );

    if (!env) {
      return reply.send({ allowed: true });
    }

    // Load rules
    const rules = await getRulesByUser(userId, env.id);
    if (!rules.length) {
      return reply.send({ allowed: true });
    }

    const result = await evaluateRateLimit({
      rules,
      identifier,
      endpoint,
      method,
      environmentId: env.id,
      now: Math.floor(Date.now() / 1000),
    });

    req.rateLimit = result;

    app.log.info(
      {
        apiKeyId: req.apiKey.id,
        userId,
        environmentId: env.id,
        endpoint,
        method,
        allowed: result.allowed,
        ruleId: result.ruleId || null,
      },
      "rate limit decision"
    );

    return reply.send(result);
  });
}
