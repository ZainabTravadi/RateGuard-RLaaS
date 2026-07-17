import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabase } from "./db/bootstrap.js";
import { getRedis, getRedisHealth, closeRedis } from "./redis/client.js";
import { serializeError } from "./errors/index.js";

async function start() {
  await ensureDatabase();

  if (env.REDIS_URL) {
    await getRedis();
    await getRedisHealth();
  }

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info({ port: env.PORT, failMode: env.RATE_LIMIT_FAIL_MODE }, "RateGuard backend running");
}

process.on("SIGINT", async () => {
  await closeRedis().catch(() => undefined);
  await app.close().catch(() => undefined);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeRedis().catch(() => undefined);
  await app.close().catch(() => undefined);
  process.exit(0);
});

start().catch((error) => {
  const serialized = serializeError(error);
  console.error(JSON.stringify(serialized, null, 2));
  process.exit(1);
});

