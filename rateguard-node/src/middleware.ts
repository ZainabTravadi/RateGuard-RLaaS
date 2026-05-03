import { checkRateLimit } from "./client.js";
import type { Request, Response, NextFunction } from 'express';
import { parseWindowToSeconds } from './utils/window.js';
import type { LimitCallOptions, LimitOptions, MiddlewareOptions, RateGuardMiddleware, RateLimitResult } from './types.js';
import { getConfig } from './config.js';
import { SDK_VERSION } from './version.js';

function defaultIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || 'anonymous';
}

/**
 * Create Express middleware with flexible options.
 */
export function middleware(options: MiddlewareOptions = {}) {
  const cfg = getConfig();
  const identifierFn = typeof options.identifier === 'function' ? options.identifier : (req: Request) => {
    if (typeof options.identifier === 'string') return options.identifier;
    return defaultIdentifier(req);
  };

  const routeLimit = options.limit ?? 100;
  const routeWindowSec = parseWindowToSeconds(options.window, 60);
  const failOpen = options.failOpen !== undefined ? options.failOpen : true;
  const debug = options.debug !== undefined ? options.debug : cfg.debug;
  const smartMode = options.smartMode ?? false;

  return (async function rateGuardMiddleware(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-RateGuard-Version', SDK_VERSION);

    if (options.skip?.(req)) {
      return next();
    }

    const identifier = identifierFn(req);
    const endpoint = req.path || String(req.originalUrl || req.url).split('?')[0];
    const method = req.method;

    try {
      const result = await checkRateLimit({ identifier, endpoint, method, smartMode });

      // Set standard headers when available
      if (typeof result.retryAfter === 'number') {
        res.setHeader('Retry-After', String(result.retryAfter));
      }
      res.setHeader('X-RateLimit-Limit', String(result.limit ?? routeLimit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining ?? 0));
      if (result.reset) {
        res.setHeader('X-RateLimit-Reset', String(result.reset));
      }

      if (!result.allowed) {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          limit: result.limit ?? routeLimit,
          remaining: result.remaining ?? 0,
          warning: result.warning ?? false,
          reason: result.reason,
          violations: result.violations,
        });
        return;
      }

      if (result.warning) {
        res.setHeader('X-RateGuard-Warning', 'true');
      }

      next();
    } catch (err) {
      const error = err as Error & { code?: string };

      if (failOpen) {
        return next();
      }

      res.status(503).json({
        error: 'RateGuard unavailable',
        message: error?.message || 'RateGuard service unavailable',
      });
    }
  }) as RateGuardMiddleware;
}

/**
 * Programmatic helper: call rate limit check and return normalized result.
 */
export async function limit(opts: LimitOptions, options: LimitCallOptions = {}): Promise<RateLimitResult> {
  const cfg = getConfig();
  const endpoint = opts.endpoint || '/';
  const method = opts.method || 'GET';
  const failOpen = options.failOpen !== undefined ? options.failOpen : true;
  const debug = options.debug !== undefined ? options.debug : cfg.debug;

  try {
    const res = await checkRateLimit({
      identifier: opts.identifier,
      endpoint,
      method,
    });

    return {
      allowed: res.allowed,
      limit: res.limit ?? 0,
      remaining: res.remaining ?? 0,
      retryAfter: res.retryAfter,
      reset: res.reset ?? null,
      ruleId: res.ruleId ?? null,
      warning: res.warning,
      message: res.message,
      reason: res.reason,
      violations: res.violations,
    };
  } catch (err) {
    if (failOpen) {
      return { allowed: true, limit: 0, remaining: 0 };
    }
    throw err;
  }
}
