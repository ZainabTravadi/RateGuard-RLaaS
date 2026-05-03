// src/modules/enforcement/enforcement.routes.js
import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluate as evaluateRateLimit } from "./rateLimit.service.js";
import { validateBody } from "../../middleware/requestValidation.js";
import { rateLimitCheckSchema } from "./enforcement.schema.js";

/**
 * SDK contract
 * POST /v1/check
 */
export async function enforcementRoutes(app) {
  app.post("/v1/check", { preHandler: validateBody(rateLimitCheckSchema) }, async (req, reply) => {
    // 🔐 API key auth MUST be done before this route
    if (!req.apiKey) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid or missing API key",
      });
    }

    const { identifier, endpoint, method } = req.body || {};
    const smartMode = req.body?.smartMode;

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
      smartMode,
      apiKeyId: req.apiKey.id,
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

    if (!result.allowed) {
      req.log.warn(
        {
          apiKeyId: req.apiKey.id,
          userId,
          endpoint,
          method,
          ruleId: result.ruleId || null,
        },
        "rate limit denied"
      );
    }

    return reply.send(result);
  });
}
