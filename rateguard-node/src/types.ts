export interface RateLimitResponse {
  allowed: boolean;
  limit?: number | null;
  remaining?: number | null;
  reset?: number | null;
  retryAfter?: number;
  ruleId?: string;
}
