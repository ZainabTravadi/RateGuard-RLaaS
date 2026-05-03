import Redis from "ioredis";
import crypto from "crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisReadyPromise = null;
let mockRedis = null;

function createMockRedis() {
  const store = new Map();
  const expires = new Map();
  const sequences = new Map();

  const isExpired = (key) => {
    const expiresAt = expires.get(key);

    if (expiresAt === undefined) {
      return false;
    }

    if (Date.now() < expiresAt) {
      return false;
    }

    store.delete(key);
    expires.delete(key);
    return true;
  };

  return {
    isMock: true,
    scripts: new Map(),
    async script(cmd, scriptStr) {
      // support script('load', script)
      if (String(cmd).toLowerCase() === 'load') {
        const sha = crypto.createHash('sha1').update(scriptStr).digest('hex');
        this.scripts.set(sha, scriptStr);
        return sha;
      }

      throw new Error('Unsupported script command');
    },
    async evalsha(sha, numKeys, ...args) {
      const script = this.scripts.get(sha);
      if (!script) {
        const err = new Error('NOSCRIPT No matching script. Please use EVAL');
        err.code = 'NOSCRIPT';
        throw err;
      }

      // forward to eval implementation
      return await this.eval(script, numKeys, ...args);
    },
    async get(key) {
      if (isExpired(key)) return null;
      return store.has(key) ? store.get(key) : null;
    },
    async mget(keys) {
      return Promise.all(keys.map((key) => this.get(key)));
    },
    async keys(pattern) {
      const escaped = String(pattern)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*/g, ".*")
        .replace(/\\\?/g, ".");

      const regex = new RegExp(`^${escaped}$`);
      return [...store.keys()].filter((key) => regex.test(key));
    },
    async scan(cursor, ...args) {
      let matchPattern = "*";

      for (let index = 0; index < args.length; index += 1) {
        if (String(args[index]).toUpperCase() === "MATCH") {
          matchPattern = args[index + 1] || "*";
        }
      }

      const keys = await this.keys(matchPattern);
      return ["0", keys];
    },
    async set(key, value) {
      store.set(key, value);
      return "OK";
    },
    async del(key) {
      expires.delete(key);
      return store.delete(key) ? 1 : 0;
    },
    async incr(key) {
      isExpired(key);
      const next = Number(store.get(key) || 0) + 1;
      store.set(key, String(next));
      return next;
    },
    async eval(script, numKeys, key) {
      // Support the sliding-window increment script which uses ZREMRANGEBYSCORE, INCR, ZADD and EXPIRE
      if (script.includes("ZREMRANGEBYSCORE") && script.includes("INCR") && script.includes("ZADD")) {
        const sequenceKey = arguments[3];
        const nowMs = Number(arguments[4]);
        const windowMs = Number(arguments[5]);
        const limitCount = Number(arguments[6]);
        const ttl = Number(arguments[7]);

        let bucket = store.get(key) || [];
        bucket = bucket.filter((entry) => entry.score > nowMs - windowMs);

        let allowed = 0;
        let retryAfter = 0;

        if (bucket.length < limitCount) {
          const nextSequence = Number(sequences.get(sequenceKey) || 0) + 1;
          sequences.set(sequenceKey, nextSequence);
          bucket.push({ score: nowMs, member: `${nowMs}:${nextSequence}` });
          // keep bucket sorted by score
          bucket.sort((a, b) => a.score - b.score);
          store.set(key, bucket);
          await this.expire(key, ttl);
          await this.expire(sequenceKey, ttl);
          allowed = 1;
          return [String(allowed), String(bucket.length), '0'];
        }

        if (bucket.length > 0) {
          retryAfter = Math.ceil((bucket[0].score + windowMs - nowMs) / 1000);
          if (retryAfter < 0) retryAfter = 0;
        } else {
          retryAfter = Math.ceil(windowMs / 1000);
        }

        return [String(0), String(bucket.length), String(retryAfter)];
      }

      // Support the earliest lookup script
      if (script.includes("ZRANGE") && script.includes("return -1")) {
        const nowMs = Number(arguments[3]);
        const windowMs = Number(arguments[4]);
        let bucket = store.get(key) || [];
        bucket = bucket.filter((entry) => entry.score > nowMs - windowMs);
        store.set(key, bucket);

        if (!bucket.length) {
          return -1;
        }

        return bucket[0].score;
      }

      throw new Error("Mock Redis received an unsupported eval script");
    },
    async expire(key, ttlSeconds) {
      if (ttlSeconds <= 0) {
        store.delete(key);
        expires.delete(key);
        return 1;
      }

      expires.set(key, Date.now() + ttlSeconds * 1000);
      return 1;
    },
    async ttl(key) {
      if (isExpired(key)) {
        return -2;
      }

      if (!store.has(key)) {
        return -2;
      }

      const expiresAt = expires.get(key);

      if (expiresAt === undefined) {
        return -1;
      }

      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      return remaining >= 0 ? remaining : -2;
    },
    async quit() {
      return "OK";
    },
    async disconnect() {
      return undefined;
    },
    async ping() {
      return "PONG";
    },
    on() {
      return undefined;
    },
  };
}

export async function getRedis() {
  if (mockRedis) {
    return mockRedis;
  }

  if (redisClient) {
    if (redisReadyPromise) {
      await redisReadyPromise;
    }

    return redisClient;
  }

  if (!env.REDIS_URL) {
    mockRedis = createMockRedis();
    logger.warn("Redis URL not set, using in-memory mock Redis for development");
    return mockRedis;
  }

  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: env.NODE_ENV === 'production' ? 10000 : 1000,
    retryStrategy(times) {
      logger.warn({ attempt: times }, "Redis reconnecting");
      if (env.NODE_ENV !== 'production') {
        return times >= 1 ? null : 50;
      }

      return Math.min(times * 50, 2000);
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis socket connected");
  });

  redisClient.on("ready", () => {
    logger.info("Redis ready");
  });

  redisClient.on("reconnecting", (delay) => {
    logger.warn({ delay }, "Redis reconnecting");
  });

  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis error");
  });

  redisClient.on("end", () => {
    logger.warn("Redis connection ended");
  });

  redisReadyPromise = redisClient
    .connect()
    .then(async () => {
      await redisClient.ping();
      return redisClient;
    })
    .catch((err) => {
      logger.error({ err }, "Redis initial connection failed");

      if (env.NODE_ENV !== "production") {
        logger.warn("Falling back to in-memory mock Redis for development");
        mockRedis = createMockRedis();
        redisClient = null;
        redisReadyPromise = null;
        return mockRedis;
      }

      redisClient = null;
      redisReadyPromise = null;
      throw err;
    });

  return redisReadyPromise;
}
