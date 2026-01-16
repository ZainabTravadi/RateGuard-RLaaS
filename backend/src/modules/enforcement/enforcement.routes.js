// src/modules/enforcement/enforcement.routes.js
import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluateRules } from "./ruleEngine.js";

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

    const result = await evaluateRules({
      rules,
      identifier,
      endpoint,
      method,
      environmentId: env.id,
      now: Math.floor(Date.now() / 1000),
    });

    return reply.send(result);
  });
}
