import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluate as evaluateRateLimit } from "./rateLimit.service.js";
import { DatabaseError } from "../../errors/index.js";

export async function enforcementGuard(req, reply) {
  if (!req.apiKey) return;

  const requestPath = req.url.split("?")[0];
  if (requestPath === "/v1/check" || requestPath === "/v1/health") {
    return;
  }

  const { userId, environment } = req.apiKey;

  try {
    const environments = await getEnvironments(userId);
    const env = environments.find((entry) => entry.name === environment && entry.is_active);

    if (!env) return;

    const rules = await getRulesByUser(userId, env.id);
    if (!rules.length) return;

    const result = await evaluateRateLimit({
      rules,
      identifier: req.ip,
      endpoint: requestPath,
      method: req.method,
      apiKeyId: req.apiKey.id,
      environmentId: env.id,
      now: Math.floor(Date.now() / 1000),
    });

    req.rateLimit = result;
    req.log.info(
      {
        apiKeyId: req.apiKey.id,
        userId,
        environmentId: env.id,
        endpoint: requestPath,
        method: req.method,
        allowed: result.allowed,
        ruleId: result.ruleId || null,
      },
      "gateway rate limit decision"
    );

    if (!result.allowed) {
      return reply
        .code(429)
        .header("Retry-After", result.retryAfter)
        .send({
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          ruleId: result.ruleId,
          requestId: req.id,
        });
    }
  } catch (error) {
    throw new DatabaseError("Gateway enforcement failed.", {
      cause: error,
      details: { userId, environment, path: requestPath },
    });
  }
}

