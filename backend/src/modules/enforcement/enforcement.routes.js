import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluate as evaluateRateLimit } from "./rateLimit.service.js";
import { validateBody } from "../../middleware/requestValidation.js";
import { rateLimitCheckSchema } from "./enforcement.schema.js";
import { AuthenticationError, ValidationError } from "../../errors/index.js";

export async function enforcementRoutes(app) {
  app.post("/v1/check", { preHandler: validateBody(rateLimitCheckSchema) }, async (req, reply) => {
    if (!req.apiKey) {
      throw new AuthenticationError("Invalid or missing API key.", {
        requestId: req.id,
        details: { route: "/v1/check" },
      });
    }

    const { identifier, endpoint, method } = req.body || {};
    const smartMode = req.body?.smartMode;

    if (!identifier || !endpoint || !method) {
      throw new ValidationError("identifier, endpoint, and method are required.", {
        details: { fields: ["identifier", "endpoint", "method"] },
        requestId: req.id,
      });
    }

    const { userId, environment } = req.apiKey;
    const environments = await getEnvironments(userId);
    const env = environments.find((entry) => entry.name === environment && entry.is_active);

    if (!env) {
      return reply.send({ allowed: true, requestId: req.id, backend: "backend", timestamp: new Date().toISOString() });
    }

    const rules = await getRulesByUser(userId, env.id);
    if (!rules.length) {
      return reply.send({ allowed: true, requestId: req.id, backend: "backend", timestamp: new Date().toISOString() });
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
    req.analyticsRequest = { endpoint, method };

    app.log.info(
      {
        requestId: req.id,
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
          requestId: req.id,
          apiKeyId: req.apiKey.id,
          userId,
          endpoint,
          method,
          ruleId: result.ruleId || null,
        },
        "rate limit denied"
      );
    }

    return reply.send({
      ...result,
      requestId: req.id,
      backend: "backend",
      timestamp: new Date().toISOString(),
    });
  });
}

