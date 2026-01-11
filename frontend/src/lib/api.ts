const API_BASE = "http://localhost:4000";

export async function api(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // ✅ ONLY set Content-Type if body exists
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "API error");
  }

  if (res.status === 204) return null;

  return res.json();
}

export default api;
