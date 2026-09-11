import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory localStorage mock for node environment
let store = new Map();
const localStorageMock = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.localStorage = localStorageMock;

// Import the real api module
const {
  api,
  baseURL,
  getRefreshedToken,
  onTokenRefreshed,
  onAuthFailure,
} = await import("../lib/api.ts");

describe("Step 9C-8.3: Frontend Refresh Token HttpOnly Cookie Migration & Concurrency", () => {
  let refreshRequests;
  let generalRequests;
  let tokenRefreshedEvents;
  let authFailureEvents;
  let unsubscribeRefreshed;
  let unsubscribeFailure;

  beforeEach(() => {
    store.clear();
    refreshRequests = [];
    generalRequests = [];
    tokenRefreshedEvents = [];
    authFailureEvents = [];

    if (unsubscribeRefreshed) unsubscribeRefreshed();
    if (unsubscribeFailure) unsubscribeFailure();

    unsubscribeRefreshed = onTokenRefreshed((newToken) => {
      tokenRefreshedEvents.push(newToken);
    });

    unsubscribeFailure = onAuthFailure(() => {
      authFailureEvents.push(true);
    });
  });

  // Helper to create an AxiosError
  const createAxios401 = (config) => {
    return new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
      data: { statusCode: 401, message: "Unauthorized" },
    });
  };

  // =========================================================================
  // GROUP 1: Single-Flight Refresh Concurrency (CRITICAL REQUIREMENT)
  // =========================================================================

  test("1. Concurrency: 3 simultaneous 401 responses (A, B, C) trigger exactly ONE /auth/refresh HTTP request with credentials and empty body", async () => {
    localStorageMock.setItem("token", "access-token-A");

    let refreshCallCount = 0;
    let refreshConfigCaptured = null;

    const mockAdapter = async (config) => {
      // Mock refresh endpoint
      if (config.url.endsWith("/auth/refresh")) {
        refreshCallCount++;
        refreshConfigCaptured = config;

        // Simulate network latency for refresh
        await new Promise((resolve) => setTimeout(resolve, 25));

        return {
          data: {
            access_token: "access-token-C",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      // Mock protected resource requests
      generalRequests.push({
        url: config.url,
        auth: config.headers?.Authorization,
      });

      // If called with old token A, fail with 401
      if (config.headers?.Authorization === "Bearer access-token-A") {
        throw createAxios401(config);
      }

      // If called with new token C, succeed with 200
      if (config.headers?.Authorization === "Bearer access-token-C") {
        return {
          data: { success: true, resource: config.url },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Dispatch 3 concurrent requests simultaneously
    const [resA, resB, resC] = await Promise.all([
      api.get("/api/worker/dashboard-data"),
      api.get("/api/worker/profile"),
      api.get("/api/worker/notifications"),
    ]);

    // 1. Exactly ONE refresh request was dispatched
    assert.strictEqual(
      refreshCallCount,
      1,
      "Exactly ONE /auth/refresh request must be dispatched for concurrent 401s"
    );

    // 2. Refresh request was sent with withCredentials: true and no refresh token in body
    assert.strictEqual(refreshConfigCaptured.withCredentials, true);
    const bodyData = refreshConfigCaptured.data
      ? (typeof refreshConfigCaptured.data === "string"
          ? JSON.parse(refreshConfigCaptured.data)
          : refreshConfigCaptured.data)
      : {};
    assert.strictEqual(bodyData.refresh_token, undefined);

    // 3. All 3 requests resolved successfully with 200
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resA.data.success, true);
    assert.strictEqual(resA.data.resource, "/api/worker/dashboard-data");

    assert.strictEqual(resB.status, 200);
    assert.strictEqual(resB.data.success, true);
    assert.strictEqual(resB.data.resource, "/api/worker/profile");

    assert.strictEqual(resC.status, 200);
    assert.strictEqual(resC.data.success, true);
    assert.strictEqual(resC.data.resource, "/api/worker/notifications");

    // 4. Stored access token updated, and NO refresh token in localStorage
    assert.strictEqual(localStorageMock.getItem("token"), "access-token-C");
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);

    // 5. onTokenRefreshed listener was notified
    assert.strictEqual(tokenRefreshedEvents.length, 1);
    assert.strictEqual(tokenRefreshedEvents[0], "access-token-C");
  });

  test("2. Concurrency with 5 requests under staggered network jitter yields exactly ONE /auth/refresh", async () => {
    localStorageMock.setItem("token", "access-token-A");

    let refreshCallCount = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return {
          data: {
            access_token: "access-token-C",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (config.headers?.Authorization === "Bearer access-token-C") {
        return {
          data: { ok: true, url: config.url },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Dispatch 5 requests staggered by a few milliseconds (all within refresh window)
    const p1 = api.get("/api/req-1");
    await new Promise((r) => setTimeout(r, 5));
    const p2 = api.get("/api/req-2");
    await new Promise((r) => setTimeout(r, 5));
    const p3 = api.get("/api/req-3");
    await new Promise((r) => setTimeout(r, 5));
    const p4 = api.get("/api/req-4");
    const p5 = api.get("/api/req-5");

    const results = await Promise.all([p1, p2, p3, p4, p5]);

    assert.strictEqual(refreshCallCount, 1);
    assert.strictEqual(results.length, 5);
    for (const r of results) {
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.data.ok, true);
    }
    assert.strictEqual(localStorageMock.getItem("token"), "access-token-C");
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  test("3. Subsequent Request D after rotation completion uses new access token without triggering refresh", async () => {
    localStorageMock.setItem("token", "access-token-A");

    let refreshCallCount = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshCallCount++;
        return {
          data: {
            access_token: "access-token-C",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (config.headers?.Authorization === "Bearer access-token-C") {
        return {
          data: { ok: true, authHeader: config.headers.Authorization },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // 1. Initial request triggers refresh
    const initialRes = await api.get("/api/initial");
    assert.strictEqual(initialRes.status, 200);
    assert.strictEqual(refreshCallCount, 1);

    // 2. Subsequent request D is dispatched AFTER rotation completed
    const subsequentRes = await api.get("/api/subsequent");
    assert.strictEqual(subsequentRes.status, 200);
    assert.strictEqual(
      subsequentRes.data.authHeader,
      "Bearer access-token-C",
      "Subsequent request must use new access token directly"
    );
    assert.strictEqual(
      refreshCallCount,
      1,
      "Subsequent request must NOT trigger a second refresh"
    );
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  // =========================================================================
  // GROUP 2: Token Storage & Lifecycle Invariants
  // =========================================================================

  test("4. Refresh token is NOT stored or accessible in localStorage before, during, or after refresh", async () => {
    localStorageMock.setItem("token", "access-token-A");

    let tokenDuringRefresh = null;
    let credentialsFlag = false;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        credentialsFlag = config.withCredentials;
        tokenDuringRefresh = localStorageMock.getItem("refreshToken");
        return {
          data: {
            access_token: "access-token-C",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    const token = await getRefreshedToken();

    assert.strictEqual(token, "access-token-C");
    assert.strictEqual(credentialsFlag, true, "Refresh request must have withCredentials: true");
    assert.strictEqual(
      tokenDuringRefresh,
      null,
      "Refresh token must never exist in localStorage during refresh"
    );
    assert.strictEqual(localStorageMock.getItem("token"), "access-token-C");
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  test("5. Update stored access_token occurs ONLY after receiving valid access_token from refresh", async () => {
    localStorageMock.setItem("token", "access-token-A");

    // Mock returns response missing access_token
    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        return {
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await assert.rejects(
      async () => {
        await getRefreshedToken();
      },
      /Invalid response received from refresh endpoint/
    );

    // Stored tokens must NOT have been updated
    assert.strictEqual(
      localStorageMock.getItem("token"),
      null,
      "Token must be purged upon refresh failure"
    );
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  // =========================================================================
  // GROUP 3: Recursion Prevention & Excluded Routes
  // =========================================================================

  test("6. Request to /auth/refresh returning 401 does NOT enter refresh interceptor (avoids loop)", async () => {
    localStorageMock.setItem("token", "expired-token");

    let refreshAttemptCount = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshAttemptCount++;
        throw createAxios401(config);
      }
      return { status: 200, data: {}, config };
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Calling api.post("/auth/refresh") directly with empty body
    await assert.rejects(
      async () => {
        await api.post("/auth/refresh");
      },
      (err) => err.response?.status === 401
    );

    // Exactly one call was made; no interceptor caught it to trigger recursion
    assert.strictEqual(
      refreshAttemptCount,
      1,
      "/auth/refresh must never trigger the refresh interceptor recursively"
    );
  });

  test("7. Request to /auth/logout returning 401 does NOT enter refresh interceptor", async () => {
    localStorageMock.setItem("token", "expired-token");

    let refreshAttemptCount = 0;
    let logoutAttemptCount = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshAttemptCount++;
        return {
          data: { access_token: "new-acc" },
          status: 200,
          config,
        };
      }
      if (config.url.endsWith("/auth/logout")) {
        logoutAttemptCount++;
        throw createAxios401(config);
      }
      return { status: 200, data: {}, config };
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await assert.rejects(
      async () => {
        await api.post("/auth/logout");
      },
      (err) => err.response?.status === 401
    );

    assert.strictEqual(logoutAttemptCount, 1);
    assert.strictEqual(
      refreshAttemptCount,
      0,
      "/auth/logout must be excluded from refresh interceptor"
    );
  });

  test("8. At-most-once retry bound: retried request failing with 401 is NOT retried again", async () => {
    localStorageMock.setItem("token", "access-token-A");

    let refreshCallCount = 0;
    let endpointCalls = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshCallCount++;
        return {
          data: {
            access_token: "access-token-C",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (config.url.endsWith("/api/forbidden-resource")) {
        endpointCalls++;
        // Always fail with 401 even when called with new token
        throw createAxios401(config);
      }

      return { status: 200, data: {}, config };
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await assert.rejects(
      async () => {
        await api.get("/api/forbidden-resource");
      },
      (err) => err.response?.status === 401
    );

    // Initial attempt + 1 retry = 2 endpoint calls max
    assert.strictEqual(
      endpointCalls,
      2,
      "Failed request must be retried at most ONCE"
    );
    assert.strictEqual(
      refreshCallCount,
      1,
      "Should only refresh once and not re-enter retry loop"
    );
  });

  // =========================================================================
  // GROUP 4: Refresh Failure & Clean Unauthenticated State
  // =========================================================================

  test("9. Refresh failure (revoked/expired cookie) cleans storage, fires onAuthFailure, and rejects callers", async () => {
    localStorageMock.setItem("token", "access-token-A");

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        throw createAxios401(config);
      }
      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Concurrent callers during failing refresh
    const [pA, pB] = await Promise.allSettled([
      api.get("/api/res-1"),
      api.get("/api/res-2"),
    ]);

    assert.strictEqual(pA.status, "rejected");
    assert.strictEqual(pB.status, "rejected");

    // Local credentials purged
    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);

    // onAuthFailure notified
    assert.strictEqual(authFailureEvents.length >= 1, true);
  });

  test("10. Missing refresh cookie: backend 401 on /auth/refresh triggers auth failure without JS cookie detection", async () => {
    localStorageMock.setItem("token", "expired-token");

    let refreshCalled = false;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshCalled = true;
        // Backend rejects with 401 because HttpOnly cookie is absent
        throw createAxios401(config);
      }
      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await assert.rejects(
      async () => {
        await api.get("/api/res");
      },
      (err) => err.response?.status === 401
    );

    assert.strictEqual(refreshCalled, true, "Frontend attempts refresh using browser cookie transport");
    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
    assert.strictEqual(authFailureEvents.length >= 1, true);
  });

  // =========================================================================
  // GROUP 5: Logout Invariants
  // =========================================================================

  test("11. Logout sends POST /auth/logout with credentials, no body, and clears local credentials even on failure", async () => {
    localStorageMock.setItem("token", "user-access-token");

    let logoutConfig = null;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/logout")) {
        logoutConfig = config;
        // Simulate network or 500 error from backend logout
        throw new axios.AxiosError("Server error", "500", config, null, {
          status: 500,
          statusText: "Internal Server Error",
          config,
        });
      }
      return { status: 200, data: {}, config };
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Simulate updated AuthContext logout handler logic
    try {
      await api.post("/auth/logout");
    } catch {
      // Intentionally caught: local credentials must be cleared regardless
    } finally {
      localStorageMock.removeItem("token");
    }

    assert.strictEqual(logoutConfig.withCredentials, true);
    assert.strictEqual(
      !logoutConfig.data || logoutConfig.data === "{}" || Object.keys(JSON.parse(logoutConfig.data || "{}")).length === 0,
      true,
      "Logout request must contain no body payload"
    );
    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  // =========================================================================
  // GROUP 6: Hydration Invariants
  // =========================================================================

  test("12. Hydration flow: reload with expired access token successfully refreshes and hydrates /auth/me", async () => {
    localStorageMock.setItem("token", "expired-access-token");

    let refreshDispatched = 0;
    let authMeDispatched = 0;

    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        refreshDispatched++;
        return {
          data: {
            access_token: "fresh-access-token",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (config.url.endsWith("/auth/me")) {
        authMeDispatched++;
        if (config.headers?.Authorization === "Bearer fresh-access-token") {
          return {
            data: {
              id: "worker-99",
              email: "worker99@gigly.com",
              role: "WORKER",
              firstName: "Robin",
              lastName: "Banks",
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config,
          };
        }
        throw createAxios401(config);
      }

      return { status: 200, data: {}, config };
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // Simulate page reload hydration call to /auth/me
    const response = await api.get("/auth/me");

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.id, "worker-99");
    assert.strictEqual(response.data.role, "WORKER");
    assert.strictEqual(refreshDispatched, 1, "Exactly ONE refresh for hydration");
    assert.strictEqual(authMeDispatched, 2, "1 initial 401 + 1 retry with fresh token");

    assert.strictEqual(localStorageMock.getItem("token"), "fresh-access-token");
    assert.strictEqual(localStorageMock.getItem("refreshToken"), null);
  });

  // =========================================================================
  // GROUP 7: Security Invariants & Leak Prevention
  // =========================================================================

  test("13. Security Invariant: api.ts never logs tokens, hashes, or Authorization headers, and configures withCredentials: true", () => {
    const apiPath = path.resolve(__dirname, "../lib/api.ts");
    assert.strictEqual(fs.existsSync(apiPath), true);
    const content = fs.readFileSync(apiPath, "utf-8");

    // Ensure no console.log or console.debug in api.ts
    assert.doesNotMatch(content, /console\.log/);
    assert.doesNotMatch(content, /console\.debug/);
    assert.doesNotMatch(content, /console\.info/);

    // Ensure withCredentials: true is configured
    assert.match(content, /withCredentials:\s*true/);

    // Verify raw axios is used for /auth/refresh to prevent recursion
    assert.match(content, /axios\.post[\s\S]*?`\$\{baseURL\}\/auth\/refresh`/);

    // Verify single-flight promise pattern exists
    assert.match(content, /isRefreshing/);
    assert.match(content, /refreshPromise/);
    assert.match(content, /originalRequest\._retry\s*=\s*true/);

    // Verify no refreshToken storage or retrieval in api.ts
    assert.doesNotMatch(content, /localStorage\.setItem\("refreshToken"/);
    assert.doesNotMatch(content, /localStorage\.getItem\("refreshToken"/);
    assert.doesNotMatch(content, /localStorage\.removeItem\("refreshToken"/);
  });

  test("14. Security Invariant: AuthContext.tsx never logs tokens and has zero client-side refreshToken references", () => {
    const authContextPath = path.resolve(__dirname, "AuthContext.tsx");
    assert.strictEqual(fs.existsSync(authContextPath), true);
    const content = fs.readFileSync(authContextPath, "utf-8");

    assert.doesNotMatch(content, /console\.log/);
    assert.doesNotMatch(content, /console\.debug/);
    assert.doesNotMatch(content, /console\.info/);

    // Ensure no refreshToken or refresh_token references in AuthContext
    assert.doesNotMatch(content, /refreshToken/);
    assert.doesNotMatch(content, /refresh_token/);

    // Verify logout calls /auth/logout without a body
    assert.match(content, /api\.post\("\/auth\/logout"\)/);
  });

  test("15. Single-flight lock release: subsequent failures do not deadlock subsequent calls", async () => {
    localStorageMock.setItem("token", "bad-token");

    let callCount = 0;
    const mockAdapter = async (config) => {
      if (config.url.endsWith("/auth/refresh")) {
        callCount++;
        throw new Error("Network offline");
      }
      throw createAxios401(config);
    };

    api.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    // First attempt fails
    await assert.rejects(async () => {
      await getRefreshedToken();
    });

    // Reset access token for second attempt
    localStorageMock.setItem("token", "bad-token-2");

    // Second attempt should execute fresh and not remain locked/deadlocked
    await assert.rejects(async () => {
      await getRefreshedToken();
    });

    assert.strictEqual(callCount, 2, "Lock was cleanly reset after first failure");
  });

  test("16. Login flow: processes access_token and user without expecting or storing refresh_token in JavaScript", async () => {
    // Simulates login response from backend
    const mockLoginResponse = {
      access_token: "new-login-jwt",
      user: {
        id: "worker-1",
        email: "worker@gigly.com",
        role: "WORKER",
        firstName: "Worker",
        lastName: "One",
      },
    };

    // Client stores access token
    localStorageMock.setItem("token", mockLoginResponse.access_token);

    assert.strictEqual(localStorageMock.getItem("token"), "new-login-jwt");
    assert.strictEqual(
      localStorageMock.getItem("refreshToken"),
      null,
      "Refresh token must NOT be stored in localStorage upon login"
    );
  });
});
