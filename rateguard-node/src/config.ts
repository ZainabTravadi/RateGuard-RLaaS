const DEFAULT_RATEGUARD_URL = process.env.RATEGUARD_URL || "https://rateguard-backend-7b9988e4d5f5.herokuapp.com";

export interface RateGuardInitConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  debug?: boolean;
}

// Internal config
interface InternalConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  debug: boolean;
}

let config: InternalConfig | null = null;

export function initConfig(cfg: RateGuardInitConfig) {
  if (!cfg || !cfg.apiKey) {
    throw new Error("RateGuard: apiKey is required");
  }

  config = {
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl || DEFAULT_RATEGUARD_URL,
    timeoutMs: typeof cfg.timeoutMs === 'number' ? cfg.timeoutMs : 5000,
    debug: !!cfg.debug,
  };
}

export function getConfig(): InternalConfig {
  if (!config) {
    throw new Error("RateGuard not initialized. Call RateGuard.init() first.");
  }
  return config;
}
