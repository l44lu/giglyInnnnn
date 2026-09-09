import axios, { type InternalAxiosRequestConfig } from "axios";

export const baseURL: string =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  typeof import.meta.env.VITE_API_URL === "string"
    ? import.meta.env.VITE_API_URL
    : "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Listener types for AuthContext synchronization
type TokenRefreshListener = (newToken: string) => void;
type AuthFailureListener = () => void;

let tokenRefreshListeners: TokenRefreshListener[] = [];
let authFailureListeners: AuthFailureListener[] = [];

export const onTokenRefreshed = (listener: TokenRefreshListener) => {
  tokenRefreshListeners.push(listener);
  return () => {
    tokenRefreshListeners = tokenRefreshListeners.filter((l) => l !== listener);
  };
};

export const onAuthFailure = (listener: AuthFailureListener) => {
  authFailureListeners.push(listener);
  return () => {
    authFailureListeners = authFailureListeners.filter((l) => l !== listener);
  };
};

const notifyTokenRefreshed = (newToken: string) => {
  tokenRefreshListeners.forEach((listener) => listener(newToken));
};

const notifyAuthFailure = () => {
  authFailureListeners.forEach((listener) => listener());
};

// Request interceptor: attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) =>
    Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

// Single-flight refresh state
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Executes server-side refresh-token rotation via POST /auth/refresh.
 * Uses a bare axios call with credentials to ensure /auth/refresh is never intercepted recursively.
 */
const executeRefresh = async (): Promise<string> => {
  const response = await axios.post<{
    access_token: string;
  }>(
    `${baseURL}/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    },
  );

  const { access_token } = response.data;

  if (!access_token) {
    throw new Error("Invalid response received from refresh endpoint");
  }

  // Update storage with newly received access token
  localStorage.setItem("token", access_token);

  notifyTokenRefreshed(access_token);

  return access_token;
};

const handleRefreshFailure = () => {
  localStorage.removeItem("token");
  notifyAuthFailure();

  if (
    typeof window !== "undefined" &&
    window.location &&
    typeof window.location.pathname === "string" &&
    window.location.pathname !== "/login"
  ) {
    window.location.href = "/login";
  }
};

/**
 * Single-flight refresh coordinator:
 * If a refresh is already in flight, all waiting requests await the same promise.
 * Exactly ONE HTTP request is dispatched to /auth/refresh.
 */
export const getRefreshedToken = async (): Promise<string> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = executeRefresh()
    .catch((err: unknown) => {
      handleRefreshFailure();
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
};

// Response interceptor: handle 401 and perform single-flight retry
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const requestUrl = originalRequest.url || "";
    const isExcluded =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/verify-reset-otp") ||
      requestUrl.includes("/auth/reset-password");

    // Do not intercept if not 401, if already retried, or if excluded route
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isExcluded
    ) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Mark that this request has been retried once (at most one retry)
    originalRequest._retry = true;

    try {
      const newAccessToken = await getRefreshedToken();

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(
        refreshError instanceof Error
          ? refreshError
          : new Error(String(refreshError)),
      );
    }
  },
);

export default api;
