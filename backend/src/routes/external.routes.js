// src/routes/external.routes.js
import { apiKeyGuard } from "../middleware/apiKey.guard.js";
import { apiKeyAuditHook } from "../middleware/apiKeyAudit.hook.js";
import { enforcementGuard } from "../modules/enforcement/enforcement.guard.js";
import { enforcementRoutes } from "../modules/enforcement/enforcement.routes.js";
import { getRedisHealth } from "../redis/client.js";
import { getMigrationStatus } from "../db/migrate.js";

export default async function externalApiRoutes(app) {
  app.register(async function scoped(app) {
    app.addHook("preHandler", apiKeyGuard);
    app.addHook("preHandler", enforcementGuard);
    app.addHook("onSend", apiKeyAuditHook);

    // ONLY external endpoints here
    app.get("/v1/health", async () => {
      const redis = await getRedisHealth();
      const migrations = await getMigrationStatus();
      return {
        ok: redis.connected,
        backendVersion: "1.0.0",
        redis: redis.status,
        redisConnected: redis.connected,
        redisMock: redis.isMock,
        migrations: {
          applied: migrations.filter((migration) => migration.applied).length,
          pending: migrations.filter((migration) => !migration.applied).length,
        },
      };
    });
    
    // SDK-facing rate limit check endpoint
    await app.register(enforcementRoutes);
  });
}
