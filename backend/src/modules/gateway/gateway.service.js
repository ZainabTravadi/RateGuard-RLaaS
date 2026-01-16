// src/modules/gateway/gateway.service.js
import { getEnvironments } from "../environments/environments.service.js";

/**
 * Forward incoming request to customer backend
 */
export async function forwardRequest({ req, environment, path }) {
  const userId = req.apiKey.userId;

  // 🔍 Resolve environment
  const environments = await getEnvironments(userId);
  const env = environments.find(
    (e) => e.name === environment && e.is_active
  );

  if (!env) {
    return {
      status: 404,
      headers: {},
      body: { error: "Invalid or inactive environment" }
    };
  }

  // 🔗 Build target URL
  const targetUrl = `${env.base_url.replace(/\/$/, "")}/${path}`;

  // 🧹 Clean headers
  const headers = { ...req.headers };
  delete headers["host"];
  delete headers["x-api-key"];
  delete headers["content-length"];

  // 🚀 Forward request
  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : JSON.stringify(req.body)
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body
  };
}
