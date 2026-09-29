import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api, { onAuthFailure } from "@/lib/api";
import type { User, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to Axios auth failure events (e.g. refresh failure or session expiry)
  useEffect(() => {
    const unsubAuth = onAuthFailure(() => {
      setUser(null);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Hydrate user profile from backend /auth/me via browser HttpOnly access_token cookie
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      return response.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Initialize authentication on app launch
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [refreshUser]);

  // Login handler: sets authenticated user state (cookies are set by backend via Set-Cookie)
  const login = useCallback(
    async (
      userOrToken?: User | string,
      maybeUser?: User,
    ): Promise<User | null> => {
      const resolvedUser =
        typeof userOrToken === "object" && userOrToken !== null
          ? userOrToken
          : maybeUser;

      if (resolvedUser) {
        setUser(resolvedUser);
        return resolvedUser;
      } else {
        return await refreshUser();
      }
    },
    [refreshUser],
  );

  // Logout handler: revokes backend session family, clears cookies, and resets user state
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Silently catch network or server errors; local state clearance must always complete
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token: null,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
export default AuthContext;
