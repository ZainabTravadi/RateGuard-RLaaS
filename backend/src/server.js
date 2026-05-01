import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabase } from "./db/bootstrap.js";
import { getRedis } from "./redis/client.js";

try {
  // Make sure required tables exist before we start listening
  await ensureDatabase();

  // Warm up Redis or fall back to the development mock.
  await getRedis();

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 RateGuard backend running at http://localhost:${env.PORT}`);
} catch (err) {
  console.error("❌ Failed to start RateGuard backend", err);
  process.exit(1);
}

