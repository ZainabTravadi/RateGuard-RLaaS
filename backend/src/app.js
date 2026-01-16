import Fastify from "fastify";
import cors from "@fastify/cors";

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
import { getRedis } from "./redis/client.js";

export const app = Fastify({ logger: true });

/* ------------------------------------------------------- */

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "x-api-key",
    "x-workspace-id",
  ],
  credentials: true,
});

/* ---------------- DASHBOARD (JWT AUTH) ---------------- */
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

/* ---------------- EXTERNAL API (API KEYS) ---------------- */
await app.register(externalApiRoutes);
