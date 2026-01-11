import Fastify from "fastify";
import cors from "@fastify/cors";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { rulesRoutes } from "./modules/rules/rules.routes.js";
import externalApiRoutes from "./routes/external.routes.js";
import { teamRoutes } from "./modules/teams/team.routes.js";
import apiKeysRoutes from "./modules/api-keys/apiKeys.routes.js";
import environmentsRoutes from "./modules/environments/environments.routes.js";

export const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "x-api-key", // 🔥 REQUIRED FOR PHASE 2 & 3
  ],
  credentials: true,
});

/* ---------------- DASHBOARD (JWT AUTH) ---------------- */
await app.register(authRoutes);
await app.register(rulesRoutes);
await app.register(apiKeysRoutes, { prefix: "/api-keys" });
await app.register(teamRoutes);
await app.register(environmentsRoutes);

/* ---------------- EXTERNAL API (API KEYS) ---------------- */
await app.register(externalApiRoutes);

