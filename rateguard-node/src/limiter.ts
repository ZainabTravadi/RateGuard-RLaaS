import { checkRateLimit } from "./client.js";

export async function limit(options: {
  identifier: string;
  endpoint: string;
  method: string;
}) {
  const result = await checkRateLimit(options);

  if (!result.allowed) {
    const error: any = new Error("Rate limit exceeded");
    error.retryAfter = result.retryAfter;
    throw error;
  }

  return result;
}
