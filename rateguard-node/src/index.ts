import { initConfig } from "./config.js";
import { createMiddleware } from "./middleware.js";
import { limit } from "./limiter.js";
import { checkRateLimit } from "./client.js";

// Export types for TypeScript users
export type { RateLimitResponse } from "./types.js";
export type { RateGuardInitConfig } from "./config.js";
export { RateLimitError } from "./errors.js";

// Main API
export const RateGuard = {
  init: initConfig,
  middleware: createMiddleware,
};

// Also export individual functions for advanced usage
export { limit, checkRateLimit };
