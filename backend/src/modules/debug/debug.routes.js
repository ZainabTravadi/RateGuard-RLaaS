/**
 * Debug routes for verifying Redis connectivity and data storage
 * These endpoints are for development/troubleshooting only
 */

import { getRedis, getRedisHealth } from "../../redis/client.js";

export async function debugRoutes(app) {
  /**
   * GET /debug/redis/health
   * Check Redis connection status
   */
  app.get("/debug/redis/health", async (req, reply) => {
    const health = await getRedisHealth();
    const statusCode = health.status === "error" ? 503 : 200;
    return reply.code(statusCode).send(health);
  });

  /**
   * GET /debug/redis
   * Inspect all Redis keys and their values
   */
  app.get("/debug/redis", async (req, reply) => {
    try {
      const redis = await getRedis();
      const isMock = redis.isMock === true;

      // Get all keys
      const keys = await redis.keys("*");
      console.log(`[Debug] Found ${keys.length} Redis keys`);

      // Get values for each key
      const data = {};
      const details = [];

      for (const key of keys) {
        try {
          const value = await redis.get(key);
          data[key] = value;
          const type = typeof value;
          const size = value ? String(value).length : 0;
          details.push({ key, type, value, size });
        } catch (err) {
          data[key] = `[Error reading: ${err.message}]`;
          details.push({ key, error: err.message });
        }
      }

      // Categorize keys
      const categories = {
        metrics_global: details.filter((d) => d.key?.startsWith("metrics:global")),
        metrics_apikey: details.filter((d) => d.key?.startsWith("metrics:apikey")),
        metrics_endpoint: details.filter((d) => d.key?.startsWith("metrics:endpoint")),
        metrics_identifier: details.filter((d) => d.key?.startsWith("metrics:identifier")),
        metrics_method: details.filter((d) => d.key?.startsWith("metrics:method")),
        metrics_hourly: details.filter((d) => d.key?.startsWith("metrics:hour")),
        metrics_daily: details.filter((d) => d.key?.startsWith("metrics:day")),
        violations: details.filter((d) => d.key?.startsWith("violations")),
        blocks: details.filter((d) => d.key?.startsWith("block")),
        other: details.filter(
          (d) =>
            !d.key?.startsWith("metrics") &&
            !d.key?.startsWith("violations") &&
            !d.key?.startsWith("block")
        ),
      };

      return reply.send({
        timestamp: new Date().toISOString(),
        isMock,
        totalKeys: keys.length,
        categories: {
          metrics_global: categories.metrics_global.length,
          metrics_apikey: categories.metrics_apikey.length,
          metrics_endpoint: categories.metrics_endpoint.length,
          metrics_identifier: categories.metrics_identifier.length,
          metrics_method: categories.metrics_method.length,
          metrics_hourly: categories.metrics_hourly.length,
          metrics_daily: categories.metrics_daily.length,
          violations: categories.violations.length,
          blocks: categories.blocks.length,
          other: categories.other.length,
        },
        details: {
          global: categories.metrics_global,
          apikey: categories.metrics_apikey.slice(0, 10), // limit to avoid huge response
          endpoint: categories.metrics_endpoint.slice(0, 10),
          violations: categories.violations.slice(0, 10),
          blocks: categories.blocks.slice(0, 10),
        },
      });
    } catch (err) {
      console.error("[Debug] Failed to inspect Redis:", err);
      return reply.code(500).send({
        error: "Failed to inspect Redis",
        message: err?.message,
      });
    }
  });

  /**
   * POST /debug/redis/clear
   * ⚠️ DANGEROUS: Clear all Redis keys (development only)
   */
  app.post("/debug/redis/clear", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({
        error: "Forbidden",
        message: "Cannot clear Redis in production",
      });
    }

    try {
      const redis = await getRedis();
      const keys = await redis.keys("*");
      console.log(`[Debug] Clearing ${keys.length} Redis keys`);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return reply.send({
        message: "Redis cleared",
        keysDeleted: keys.length,
      });
    } catch (err) {
      console.error("[Debug] Failed to clear Redis:", err);
      return reply.code(500).send({
        error: "Failed to clear Redis",
        message: err?.message,
      });
    }
  });

  /**
   * GET /debug/redis/metrics/global
   * Get global metrics summary
   */
  app.get("/debug/redis/metrics/global", async (req, reply) => {
    try {
      const redis = await getRedis();
      const [requests, allowed, blocked, warnings, violations] = await Promise.all([
        redis.get("metrics:global:requests").then((v) => Number(v || 0)),
        redis.get("metrics:global:allowed").then((v) => Number(v || 0)),
        redis.get("metrics:global:blocked").then((v) => Number(v || 0)),
        redis.get("metrics:warnings").then((v) => Number(v || 0)),
        redis.get("metrics:violations").then((v) => Number(v || 0)),
      ]);

      const blockRate = requests > 0 ? ((blocked / requests) * 100).toFixed(2) : 0;

      return reply.send({
        timestamp: new Date().toISOString(),
        metrics: {
          totalRequests: requests,
          allowedRequests: allowed,
          blockedRequests: blocked,
          blockRate: `${blockRate}%`,
          warningsIssued: warnings,
          violationsRecorded: violations,
        },
      });
    } catch (err) {
      console.error("[Debug] Failed to get global metrics:", err);
      return reply.code(500).send({
        error: "Failed to get global metrics",
        message: err?.message,
      });
    }
  });

  /**
   * GET /debug/redis/test
   * Test Redis by writing and reading a test key
   */
  app.get("/debug/redis/test", async (req, reply) => {
    try {
      const redis = await getRedis();
      const testKey = `debug:test:${Date.now()}`;
      const testValue = `test-value-${Date.now()}`;

      // Write test key
      console.log(`[Debug] Writing test key: ${testKey} = ${testValue}`);
      const writeResult = await redis.set(testKey, testValue, "EX", 60);
      console.log(`[Debug] Write result: ${writeResult}`);

      // Read test key
      const readValue = await redis.get(testKey);
      console.log(`[Debug] Read value: ${readValue}`);

      // Verify
      const success = readValue === testValue;

      // Cleanup
      await redis.del(testKey);

      return reply.send({
        timestamp: new Date().toISOString(),
        isMock: redis.isMock === true,
        test: {
          key: testKey,
          written: testValue,
          read: readValue,
          success,
          message: success ? "✅ Redis read/write working!" : "❌ Redis read/write FAILED!",
        },
      });
    } catch (err) {
      console.error("[Debug] Redis test failed:", err);
      return reply.code(500).send({
        error: "Redis test failed",
        message: err?.message,
      });
    }
  });
}
