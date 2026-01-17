import { getConfig } from "./config.js";
import { RateLimitResponse } from "./types.js";

export async function checkRateLimit(payload: {
  identifier: string;
  endpoint: string;
  method: string;
}): Promise<RateLimitResponse> {
  const { apiKey, baseUrl } = getConfig();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/v1/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[RateGuard] API error:", {
        status: res.status,
        endpoint: payload.endpoint,
      });
      return { allowed: true };
    }

    return (await res.json()) as RateLimitResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[RateGuard] Request timeout after 5s");
      } else {
        console.error("[RateGuard] Network error:", error.message);
      }
    }
    return { allowed: true };
  }
}
