import {
  getRulesByUser,
  createRule,
  toggleRule,
  deleteRule,
} from "./rules.service.js";

export async function getRules(req, reply) {
  const { environmentId } = req.query;

  if (!environmentId) {
    return reply.code(400).send({ error: "environmentId required" });
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
    return reply.code(400).send({ error: "environmentId required" });
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
      received: environmentId,
    });
  }

  const deletedCount = await deleteRule(id, userId, environmentId);

  if (deletedCount === 0) {
    return reply.code(404).send({
      error: "Rule not found or environment mismatch",
    });
  }

  reply.code(204).send();
}
