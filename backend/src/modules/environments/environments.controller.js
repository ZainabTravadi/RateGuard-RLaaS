import * as service from "./environments.service.js";

export async function listEnvironments(req, reply) {
  const envs = await service.getEnvironments(req.user.userId);
  reply.send(envs);
}

export async function updateEnvironment(req, reply) {
  await service.updateEnvironment(
    req.user.userId,
    req.params.id,
    req.body
  );

  reply.send({ success: true });
}
