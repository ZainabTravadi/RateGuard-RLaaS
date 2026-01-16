// src/modules/enforcement/enforcement.guard.js
import { getEnvironments } from "../environments/environments.service.js";
import { getRulesByUser } from "../rules/rules.service.js";
import { evaluateRules } from "./ruleEngine.js";

/**
 * Gateway-only blocking middleware
 */
export async function enforcementGuard(req, reply) {
  if (!req.apiKey) return;

  const { userId, environment } = req.apiKey;

  const environments = await getEnvironments(userId);
  const env = environments.find(
    (e) => e.name === environment && e.is_active
  );

  if (!env) return;

  const rules = await getRulesByUser(userId, env.id);
  if (!rules.length) return;

  const endpoint = req.url.split("?")[0];

  const result = await evaluateRules({
    rules,
    identifier: req.ip,
    endpoint,
    method: req.method,
    environmentId: env.id,
    now: Math.floor(Date.now() / 1000),
  });

  if (!result.allowed) {
    reply
      .code(429)
      .header("Retry-After", result.retryAfter)
      .send({
        error: "Rate limit exceeded",
        ruleId: result.ruleId,
      });
  }
}
