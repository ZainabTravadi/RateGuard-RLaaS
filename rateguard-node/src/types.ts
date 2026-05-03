import type { Request, RequestHandler } from 'express';

export interface RateLimitResponse {
  allowed: boolean;
  limit?: number | null;
  remaining?: number | null;
  reset?: number | null;
  retryAfter?: number;
  ruleId?: string;
  warning?: boolean;
  message?: string;
  reason?: string;
  violations?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
  reset?: number | null;
  ruleId?: string | null;
  warning?: boolean;
  message?: string;
  reason?: string;
  violations?: number;
}

export interface MiddlewareOptions {
  identifier?: ((req: Request) => string) | string;
  skip?: (req: Request) => boolean;
  limit?: number;
  window?: string | number; // e.g. '1m' or seconds
  failOpen?: boolean;
  debug?: boolean;
  smartMode?: boolean;
}

export interface LimitOptions {
  identifier: string;
  endpoint?: string;
  method?: string;
}

export interface LimitCallOptions {
  failOpen?: boolean;
  debug?: boolean;
}

export type RateGuardMiddleware = RequestHandler;
