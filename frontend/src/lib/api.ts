import axios, { type InternalAxiosRequestConfig } from "axios";
import { isApiResponse } from "../types/api.ts";

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
type TokenRefreshListener = (newToken?: string) => void;
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

const notifyTokenRefreshed = (newToken?: string) => {
  tokenRefreshListeners.forEach((listener) => listener(newToken));
};

const notifyAuthFailure = () => {
  authFailureListeners.forEach((listener) => listener());
};

// Single-flight refresh state
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Executes server-side refresh-token rotation via POST /auth/refresh.
 * Uses a bare axios call with credentials to ensure /auth/refresh is never intercepted recursively.
 * The browser automatically transmits the HttpOnly refresh_token cookie and receives rotated cookies.
 */
const executeRefresh = async (): Promise<void> => {
  await axios.post(
    `${baseURL}/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    },
  );

  notifyTokenRefreshed();
};

const handleRefreshFailure = () => {
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
export const getRefreshedToken = async (): Promise<void> => {
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

// Response interceptor: unwraps common ApiResponse envelope and handles 401 retry
api.interceptors.response.use(
  (response) => {
    const isBinary =
      response.config.responseType === "blob" ||
      response.config.responseType === "arraybuffer" ||
      response.config.responseType === "stream" ||
      (typeof Blob !== "undefined" && response.data instanceof Blob) ||
      (typeof ArrayBuffer !== "undefined" &&
        response.data instanceof ArrayBuffer);

    if (!isBinary && isApiResponse(response.data)) {
      response.data = response.data.data;
    }

    return response;
  },
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
      await getRefreshedToken();
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

export { isApiResponse };
export default api;
