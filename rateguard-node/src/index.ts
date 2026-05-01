import { initConfig } from "./config.js";
import { middleware, limit } from "./middleware.js";

// Export types for TypeScript users
export type {
  RateLimitResponse,
  RateLimitResult,
  MiddlewareOptions,
  LimitOptions,
  LimitCallOptions,
  RateGuardMiddleware,
} from "./types.js";
export type { RateGuardInitConfig } from "./config.js";
export { RateLimitError } from "./errors.js";
export { SDK_VERSION } from "./version.js";

// Main API
export const RateGuard = {
  init: initConfig,
  middleware,
  limit,
};
