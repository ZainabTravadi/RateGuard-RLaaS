declare global {
  interface Window {
    __RATEGUARD_API_URL?: string;
  }
}

export function getApiBaseUrl() {
  const buildTimeUrl = import.meta.env.VITE_API_URL;

  if (buildTimeUrl) {
    return buildTimeUrl;
  }

  if (typeof window !== "undefined" && window.__RATEGUARD_API_URL) {
    return window.__RATEGUARD_API_URL;
  }

  return "http://localhost:4000";
}
