import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabase } from "./db/bootstrap.js";
import { getRedis, getRedisHealth } from "./redis/client.js";

try {
  // Make sure required tables exist before we start listening
  console.log("🔄 Initializing database...");
  await ensureDatabase();
  console.log("✅ Database initialized");

  // Warm up Redis or fall back to the development mock
  console.log("🔄 Initializing Redis...");
  await getRedis();
  const redisHealth = await getRedisHealth();
  console.log(`✅ Redis initialized: ${JSON.stringify(redisHealth)}`);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 RateGuard backend running at http://localhost:${env.PORT}`);
  console.log(`📊 Dashboard: http://localhost:${env.PORT}/...`);
  console.log(`🔐 Enforcement: POST http://localhost:${env.PORT}/v1/check`);
  console.log(`🩺 Redis Debug: GET http://localhost:${env.PORT}/debug/redis`);
  console.log(`🩺 Redis Health: GET http://localhost:${env.PORT}/debug/redis/health`);
} catch (err) {
  console.error("❌ Failed to start RateGuard backend", err);
  process.exit(1);
}

