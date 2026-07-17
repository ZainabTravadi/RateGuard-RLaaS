import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { randomUUID } from "crypto";
import { env } from "./config/env.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { rulesRoutes } from "./modules/rules/rules.routes.js";
import externalApiRoutes from "./routes/external.routes.js";
import apiKeysRoutes from "./modules/api-keys/apiKeys.routes.js";
import environmentsRoutes from "./modules/environments/environments.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { logsRoutes } from "./modules/logs/logs.routes.js";
import gatewayRoutes from "./modules/gateway/gateway.routes.js";
import { overviewRoutes } from "./modules/overview/overview.routes.js";
import { workspaceRoutes } from "./modules/workspaces/workspaces.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.x-api-key",
        "req.headers.cookie",
        "res.headers.set-cookie",
      ],
      remove: true,
    },
  },
  requestIdHeader: "x-request-id",
  genReqId: (request) => {
    return String(request.headers["x-request-id"] || request.headers["x-correlation-id"] || randomUUID());
  },
});

app.addHook("onRequest", async (request, reply) => {
  reply.header("X-Request-Id", request.id);
  reply.header("X-Correlation-Id", request.id);
  request.log.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    },
    "incoming request"
  );
});

app.setErrorHandler(errorHandler);

await app.register(helmet, {
  global: true,
});

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (env.NODE_ENV === "production") {
      const allowed = process.env.FRONTEND_URL || "https://rateguard-frontend.vercel.app";
      return cb(null, origin === allowed);
    }
    return cb(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "x-api-key",
    "x-workspace-id",
    "x-request-id",
    "x-correlation-id",
  ],
  credentials: true,
});

await app.register(authRoutes);
await app.register(rulesRoutes);
await app.register(overviewRoutes);
await app.register(apiKeysRoutes, { prefix: "/api-keys" });
await app.register(workspaceRoutes);
await app.register(notificationRoutes);
await app.register(environmentsRoutes);
await app.register(analyticsRoutes);
await app.register(logsRoutes);
await app.register(gatewayRoutes);
await app.register(externalApiRoutes);

