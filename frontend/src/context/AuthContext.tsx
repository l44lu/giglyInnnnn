import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api, { onTokenRefreshed, onAuthFailure } from "@/lib/api";
import type { User, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to Axios token refresh & auth failure events
  useEffect(() => {
    const unsubToken = onTokenRefreshed((newToken) => {
      setToken(newToken);
    });

    const unsubAuth = onAuthFailure(() => {
      setToken(null);
      setUser(null);
    });

    return () => {
      unsubToken();
      unsubAuth();
    };
  }, []);

  // Hydrate user profile from backend /auth/me on mount or token change
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      return response.data;
    } catch {
      // Token is invalid or expired and could not be refreshed
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Initialize authentication on app launch
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    void initializeAuth();
  }, [refreshUser]);

  // Login handler: stores access token and sets user
  const login = useCallback(
    async (newToken: string, initialUser?: User): Promise<User | null> => {
      localStorage.setItem("token", newToken);
      setToken(newToken);

      if (initialUser) {
        setUser(initialUser);
        return initialUser;
      } else {
        return await refreshUser();
      }
    },
    [refreshUser],
  );

  // Logout handler: revokes backend session family and cleans local credentials
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Silently catch network or server errors; local clearance must always complete
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      role: user?.role ?? null,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
export default AuthContext;
