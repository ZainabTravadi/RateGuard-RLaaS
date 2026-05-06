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

/**
 * Health check for Redis connection and functionality
 * @returns {Promise<{status: string, connected: boolean, isMock: boolean, timestamp: number}>}
 */
export async function getRedisHealth() {
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    const isMock = redis.isMock === true;
    
    const status = pong === "PONG" 
      ? (isMock ? "healthy_mock" : "healthy")
      : "degraded";
    
    logger.info({ status, isMock, pong }, "[Redis Health] Status check");
    
    return {
      status,
      connected: pong === "PONG",
      isMock,
      timestamp: Date.now(),
    };
  } catch (err) {
    logger.error({ err: err?.message || err }, "[Redis Health] Check failed");
    return {
      status: "error",
      connected: false,
      error: err?.message,
      timestamp: Date.now(),
    };
  }
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
    logger.warn("[Redis] No REDIS_URL set, using in-memory mock Redis for development");
    return mockRedis;
  }

  // enable TLS for providers like Upstash when URL or hostname indicates TLS is required
  const redisOptions = {
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
  };

  try {
    const url = new URL(env.REDIS_URL);
    const hostname = url.hostname || '';
    const protocol = url.protocol || '';

    // Upstash and other managed Redis often require TLS; if URL indicates upstash or protocol is rediss, enable tls
    if (protocol === 'rediss:' || hostname.includes('upstash') || env.REDIS_URL.startsWith('rediss://')) {
      redisOptions.tls = {};
    }
  } catch (err) {
    // ignore URL parse errors and proceed without TLS
  }

  redisClient = new Redis(env.REDIS_URL, redisOptions);

  redisClient.on("connect", () => {
    logger.info("[Redis] Socket connected");
  });

  redisClient.on("ready", () => {
    logger.info("[Redis] Ready and operational");
  });

  redisClient.on("reconnecting", (delay) => {
    logger.warn({ delayMs: delay }, "[Redis] Reconnecting");
  });

  redisClient.on("error", (err) => {
    logger.error({ err, code: err?.code }, "[Redis] Error event");
  });

  redisClient.on("end", () => {
    logger.warn("[Redis] Connection ended");
  });

  redisReadyPromise = redisClient
    .connect()
    .then(async () => {
      const pong = await redisClient.ping();
      logger.info({ ping: pong }, "[Redis] Initial ping successful");
      return redisClient;
    })
    .catch((err) => {
      logger.error({ err: err?.message, code: err?.code }, "[Redis] Initial connection failed");

      if (env.NODE_ENV !== "production") {
        logger.warn("[Redis] Falling back to in-memory mock Redis for development");
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
