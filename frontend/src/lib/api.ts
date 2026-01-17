// Determine API base URL
// Priority 1: Vercel env var (build-time)
// Priority 2: Runtime window variable (injected)
// Priority 3: Production hardcoded URL
const getApiBase = () => {
  // Check build-time env var first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check for runtime injection (fallback)
  if (typeof window !== 'undefined' && (window as any).__RATEGUARD_API_URL) {
    return (window as any).__RATEGUARD_API_URL;
  }
  
  // Production hardcoded URL - NEVER localhost in production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://rateguard-7b9988e4d5f5.herokuapp.com';
  }
  
  // Development/local only
  return 'http://localhost:4000';
};

const API_BASE = getApiBase();

// Debug log
if (import.meta.env.DEV) {
  console.log('[RateGuard API] Using base URL:', API_BASE);
} else {
  console.log('[RateGuard API] Production mode - API URL:', API_BASE);
}

export async function api(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");
  const workspaceId = localStorage.getItem("workspaceId");

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
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
