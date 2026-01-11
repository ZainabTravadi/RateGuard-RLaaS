import * as service from "./apiKeys.service.js";

export async function listKeys(req, reply) {
  const keys = await service.getApiKeys(req.user.userId);
  reply.send(keys);
}

export async function createKey(req, reply) {
  const result = await service.createApiKey(req.user.userId, req.body);
  reply.code(201).send(result);
}

export async function rotateKey(req, reply) {
  const key = await service.rotateApiKey(
    req.user.userId,
    req.params.id
  );
  reply.send({ apiKey: key });
}

export async function deleteKey(req, reply) {
  await service.revokeApiKey(req.user.userId, req.params.id);
  reply.code(204).send();
}
