import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const API = "http://localhost:4000";

/* ======================
   Types
====================== */
interface Environment {
  id: string;
}

interface User {
  id: string;
  email: string;
  environment: Environment;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

/* ======================
   Context
====================== */
const AuthContext = createContext<AuthContextType | null>(null);

/* ======================
   Provider
====================== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ======================
     Load user on refresh
  ====================== */
  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Invalid token");
        }

        const user: User = await res.json();

        if (!user.environment?.id) {
          throw new Error("No environment assigned to user");
        }

        // ✅ ALWAYS restore environmentId on refresh
        localStorage.setItem("environmentId", user.environment.id);
        setUser(user);
      } catch (err) {
        console.error("Auth bootstrap failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("environmentId");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  /* ======================
     Login
  ====================== */
  const login = async (token: string) => {
    localStorage.setItem("token", token);

    const res = await fetch(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      localStorage.removeItem("token");
      throw new Error("Failed to fetch user");
    }

    const user: User = await res.json();

    if (!user.environment?.id) {
      localStorage.removeItem("token");
      throw new Error("No environment assigned to user");
    }

    // ✅ THIS FIXES ALL YOUR RULES ISSUES
    localStorage.setItem("environmentId", user.environment.id);

    setUser(user);
  };

  /* ======================
     Logout
  ====================== */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("environmentId");
    setUser(null);
    window.location.href = "/login";
  };

  /* ======================
     Provider value
  ====================== */
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ======================
   Hook
====================== */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
