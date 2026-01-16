import Redis from "ioredis";
import { env } from "../config/env.js";

let redis;
let logged = false;

export function getRedis() {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    redis.on("connect", () => {
      if (!logged) {
        console.log("🔴 Redis connected");
        logged = true;
      }
    });

    redis.on("error", (err) => {
      console.error("❌ Redis error", err);
    });
  }

  return redis;
}
