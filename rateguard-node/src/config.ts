// Production RateGuard service URL
const RATEGUARD_SERVICE_URL = "https://rateguard-7b9988e4d5f5.herokuapp.com";

// User-facing config - simple, just API key
export interface RateGuardInitConfig {
  apiKey: string;
}

// Internal config with baseUrl
interface InternalConfig {
  apiKey: string;
  baseUrl: string;
}

let config: InternalConfig | null = null;

export function initConfig(cfg: RateGuardInitConfig) {
  if (!cfg.apiKey) {
    throw new Error("RateGuard: apiKey is required");
  }

  config = {
    apiKey: cfg.apiKey,
    baseUrl: process.env.RATEGUARD_URL || RATEGUARD_SERVICE_URL,
  };
}

export function getConfig(): InternalConfig {
  if (!config) {
    throw new Error(
      "RateGuard not initialized. Call RateGuard.init() first."
    );
  }
  return config;
}
