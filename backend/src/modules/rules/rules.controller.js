import {
  getRulesByUser,
  createRule,
  toggleRule,
  deleteRule,
  updateRule
} from "./rules.service.js";

export async function getRules(req, reply) {
  const { environmentId } = req.query;

  if (!environmentId) {
    return reply.code(400).send({ error: "environmentId required", code: "MISSING_ENVIRONMENT_ID" });
  }

  const rules = await getRulesByUser(
    req.user.userId,
    environmentId
  );

  reply.send(rules);
}

export async function createRuleHandler(req, reply) {
  const userId = req.user.userId;
  const { environmentId } = req.query;

  if (!environmentId) {
    return reply.code(400).send({ error: "environmentId required", code: "MISSING_ENVIRONMENT_ID" });
  }

  const rule = await createRule({
    userId,
    environmentId,
    ...req.body,
  });

  reply.code(201).send(rule);
}

export async function toggleRuleHandler(req, reply) {
  const userId = req.user.userId;
  const { id } = req.params;

  const rule = await toggleRule(id, userId);
  reply.send(rule);
}

export async function deleteRuleHandler(req, reply) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { environmentId } = req.query;

  if (!environmentId || environmentId === "null") {
    return reply.code(400).send({
      error: "environmentId required",
      code: "MISSING_ENVIRONMENT_ID",
      received: environmentId,
    });
  }

  const deletedCount = await deleteRule(id, userId, environmentId);

  if (deletedCount === 0) {
    return reply.code(404).send({
      error: "Rule not found or environment mismatch",
      code: "RULE_NOT_FOUND",
    });
  }

  reply.code(204).send();
}

export async function updateRuleHandler(req, reply) {
  const { id } = req.params;
  const { limit, scope, endpoint, windowSeconds } = req.body;
  const { environmentId } = req.query;

  const rule = await updateRule(
    id,
    req.user.userId,
    environmentId,
    {
      limit,
      scope,
      endpoint,       // 🔥 MUST BE PASSED
      windowSeconds
    }
  );

  reply.send(rule);
}
