// src/modules/gateway/gateway.controller.js
import { forwardRequest } from "./gateway.service.js";

export async function handleGatewayRequest(req, reply) {
  const { environment } = req.params;

  // Fastify wildcard path
  const proxiedPath = req.params["*"];

  if (!proxiedPath) {
    return reply.code(400).send({
      error: "Missing target path"
    });
  }

  const result = await forwardRequest({
    req,
    environment,
    path: proxiedPath
  });

  // Forward status + headers + body exactly
  reply
    .code(result.status)
    .headers(result.headers)
    .send(result.body);
}
