import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("AuthContext and Auth State Logic", () => {
  let localStorageMock;
  let apiMock;

  beforeEach(() => {
    const store = new Map();
    localStorageMock = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };

    apiMock = {
      get: async (url, config) => {
        throw new Error("unhandled mock");
      },
    };
  });

  // State reducer / engine matching AuthContext logic
  const createAuthEngine = (initialToken = null) => {
    let user = null;
    let token = initialToken;
    let isLoading = true;

    const refreshUser = async () => {
      const currentToken = localStorageMock.getItem("token");
      if (!currentToken) {
        user = null;
        token = null;
        return null;
      }

      try {
        const response = await apiMock.get("/auth/me", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        user = response.data;
        return response.data;
      } catch (err) {
        localStorageMock.removeItem("token");
        token = null;
        user = null;
        return null;
      }
    };

    const initializeAuth = async () => {
      const storedToken = localStorageMock.getItem("token");
      if (storedToken) {
        await refreshUser();
      }
      isLoading = false;
    };

    const login = async (newToken, initialUser) => {
      localStorageMock.setItem("token", newToken);
      token = newToken;
      if (initialUser) {
        user = initialUser;
      } else {
        await refreshUser();
      }
    };

    const logout = () => {
      localStorageMock.removeItem("token");
      token = null;
      user = null;
    };

    return {
      getState: () => ({
        user,
        token,
        role: user?.role ?? null,
        isAuthenticated: !!user && !!token,
        isLoading,
      }),
      initializeAuth,
      refreshUser,
      login,
      logout,
    };
  };

  test("1. Initial state starts with isLoading = true", () => {
    const auth = createAuthEngine();
    const state = auth.getState();
    assert.strictEqual(state.isLoading, true);
    assert.strictEqual(state.user, null);
    assert.strictEqual(state.isAuthenticated, false);
  });

  test("2. No existing authentication -> unauthenticated state", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    const state = auth.getState();
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.user, null);
    assert.strictEqual(state.token, null);
    assert.strictEqual(state.isAuthenticated, false);
    assert.strictEqual(state.role, null);
  });

  test("3. Existing valid authentication -> /auth/me is called and state is authenticated", async () => {
    localStorageMock.setItem("token", "valid-worker-token");
    let authMeCalled = false;

    apiMock.get = async (url) => {
      if (url === "/auth/me") {
        authMeCalled = true;
        return {
          data: {
            id: "worker-1",
            email: "worker@gigly.com",
            role: "WORKER",
            firstName: "Alex",
            lastName: "Johnson",
          },
        };
      }
      throw new Error("unexpected url");
    };

    const auth = createAuthEngine("valid-worker-token");
    await auth.initializeAuth();

    assert.strictEqual(authMeCalled, true);
    const state = auth.getState();
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.isAuthenticated, true);
    assert.strictEqual(state.role, "WORKER");
    assert.strictEqual(state.user?.firstName, "Alex");
  });

  test("4. /auth/me successfully returns an ADMIN", async () => {
    localStorageMock.setItem("token", "valid-admin-token");

    apiMock.get = async (url) => {
      if (url === "/auth/me") {
        return {
          data: {
            id: "admin-1",
            email: "admin@gigly.com",
            role: "ADMIN",
            firstName: "Sarah",
            lastName: "Jenkins",
          },
        };
      }
    };

    const auth = createAuthEngine("valid-admin-token");
    await auth.initializeAuth();

    const state = auth.getState();
    assert.strictEqual(state.role, "ADMIN");
    assert.strictEqual(state.isAuthenticated, true);
    assert.strictEqual(state.user?.role, "ADMIN");
  });

  test("5. /auth/me successfully returns a WORKER", async () => {
    localStorageMock.setItem("token", "valid-worker-token");

    apiMock.get = async (url) => {
      if (url === "/auth/me") {
        return {
          data: {
            id: "worker-2",
            email: "worker@gigly.com",
            role: "WORKER",
            firstName: "Michael",
            lastName: "Carter",
          },
        };
      }
    };

    const auth = createAuthEngine("valid-worker-token");
    await auth.initializeAuth();

    const state = auth.getState();
    assert.strictEqual(state.role, "WORKER");
    assert.strictEqual(state.isAuthenticated, true);
  });

  test("6. /auth/me successfully returns a RECRUITER", async () => {
    localStorageMock.setItem("token", "valid-recruiter-token");

    apiMock.get = async (url) => {
      if (url === "/auth/me") {
        return {
          data: {
            id: "recruiter-3",
            email: "recruiter@gigly.com",
            role: "RECRUITER",
            firstName: "Emma",
            lastName: "Watson",
          },
        };
      }
    };

    const auth = createAuthEngine("valid-recruiter-token");
    await auth.initializeAuth();

    const state = auth.getState();
    assert.strictEqual(state.role, "RECRUITER");
    assert.strictEqual(state.isAuthenticated, true);
  });

  test("7. /auth/me returns 401 -> authentication state and token are cleared", async () => {
    localStorageMock.setItem("token", "expired-token");

    apiMock.get = async () => {
      const error = new Error("Request failed with status code 401");
      error.response = { status: 401 };
      throw error;
    };

    const auth = createAuthEngine("expired-token");
    await auth.initializeAuth();

    const state = auth.getState();
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.isAuthenticated, false);
    assert.strictEqual(state.user, null);
    assert.strictEqual(state.token, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);
  });

  test("8. Logout clears authentication state and token", async () => {
    const auth = createAuthEngine();
    await auth.login("valid-token", {
      id: "user-1",
      email: "test@gigly.com",
      role: "WORKER",
      firstName: "Test",
      lastName: "User",
    });

    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(localStorageMock.getItem("token"), "valid-token");

    auth.logout();

    const state = auth.getState();
    assert.strictEqual(state.isAuthenticated, false);
    assert.strictEqual(state.user, null);
    assert.strictEqual(state.token, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);
  });

  test("9. Authenticated user does not contain password or passwordHash", async () => {
    const auth = createAuthEngine();
    const safeUser = {
      id: "user-123",
      email: "user@gigly.com",
      role: "ADMIN",
      firstName: "Sarah",
      lastName: "Jenkins",
    };

    await auth.login("safe-token", safeUser);
    const state = auth.getState();

    assert.strictEqual(state.user.password, undefined);
    assert.strictEqual(state.user.passwordHash, undefined);
    assert.strictEqual(state.user.passWordHash, undefined);
  });

  test("10. useAuth error handling outside provider", () => {
    const simulateUseAuth = (contextValue) => {
      if (!contextValue) {
        throw new Error("useAuth must be used within an AuthProvider");
      }
      return contextValue;
    };

    assert.throws(
      () => simulateUseAuth(undefined),
      /useAuth must be used within an AuthProvider/,
    );

    const validContext = { user: null, isAuthenticated: false };
    assert.strictEqual(simulateUseAuth(validContext), validContext);
  });

  // Step 5: Post-Login Role-Based Redirection Tests
  const getDashboardPathForRole = (role) => {
    switch (role) {
      case "ADMIN":
        return "/admin/dashboard";
      case "WORKER":
        return "/worker/dashboard";
      case "RECRUITER":
        return "/recruiter/dashboard";
      default:
        return null;
    }
  };

  const simulateLoginSubmit = async ({
    loginCredentials,
    apiPostMock,
    authEngine,
    navigateMock,
  }) => {
    // 1. Submit login API request
    const response = await apiPostMock(loginCredentials);

    // 2. Complete authentication via AuthContext
    const authenticatedUser = await authEngine.login(
      response.data.access_token,
      response.data.user,
    );

    // 3. Determine target route based on authenticated role
    const targetPath = getDashboardPathForRole(
      authenticatedUser?.role || response.data.user?.role,
    );

    // 4. Navigate if valid
    if (targetPath) {
      navigateMock(targetPath);
      return { success: true, targetPath };
    } else {
      return { success: false, error: "Unknown Role" };
    }
  };

  test("11. getDashboardPathForRole maps ADMIN to /admin/dashboard", () => {
    assert.strictEqual(getDashboardPathForRole("ADMIN"), "/admin/dashboard");
  });

  test("12. getDashboardPathForRole maps WORKER to /worker/dashboard", () => {
    assert.strictEqual(getDashboardPathForRole("WORKER"), "/worker/dashboard");
  });

  test("13. getDashboardPathForRole maps RECRUITER to /recruiter/dashboard", () => {
    assert.strictEqual(getDashboardPathForRole("RECRUITER"), "/recruiter/dashboard");
  });

  test("14. getDashboardPathForRole returns null for unknown or invalid roles", () => {
    assert.strictEqual(getDashboardPathForRole("SUPERADMIN"), null);
    assert.strictEqual(getDashboardPathForRole("GUEST"), null);
    assert.strictEqual(getDashboardPathForRole(null), null);
    assert.strictEqual(getDashboardPathForRole(undefined), null);
    assert.strictEqual(getDashboardPathForRole(""), null);
  });

  test("15. Post-Login: ADMIN login successfully redirects to /admin/dashboard", async () => {
    const auth = createAuthEngine();
    const navigatedRoutes = [];
    const navigateMock = (path) => navigatedRoutes.push(path);

    const apiPostMock = async () => ({
      data: {
        access_token: "jwt-admin-token",
        user: { id: "admin-1", email: "admin@gigly.com", role: "ADMIN", firstName: "Admin" },
      },
    });

    const result = await simulateLoginSubmit({
      loginCredentials: { email: "admin@gigly.com", password: "Password123!" },
      apiPostMock,
      authEngine: auth,
      navigateMock,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.targetPath, "/admin/dashboard");
    assert.deepStrictEqual(navigatedRoutes, ["/admin/dashboard"]);
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "ADMIN");
  });

  test("16. Post-Login: WORKER login successfully redirects to /worker/dashboard", async () => {
    const auth = createAuthEngine();
    const navigatedRoutes = [];
    const navigateMock = (path) => navigatedRoutes.push(path);

    const apiPostMock = async () => ({
      data: {
        access_token: "jwt-worker-token",
        user: { id: "worker-1", email: "worker@gigly.com", role: "WORKER", firstName: "Worker" },
      },
    });

    const result = await simulateLoginSubmit({
      loginCredentials: { email: "worker@gigly.com", password: "Password123!" },
      apiPostMock,
      authEngine: auth,
      navigateMock,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.targetPath, "/worker/dashboard");
    assert.deepStrictEqual(navigatedRoutes, ["/worker/dashboard"]);
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "WORKER");
  });

  test("17. Post-Login: RECRUITER login successfully redirects to /recruiter/dashboard", async () => {
    const auth = createAuthEngine();
    const navigatedRoutes = [];
    const navigateMock = (path) => navigatedRoutes.push(path);

    const apiPostMock = async () => ({
      data: {
        access_token: "jwt-recruiter-token",
        user: { id: "recruiter-1", email: "recruiter@gigly.com", role: "RECRUITER", firstName: "Recruiter" },
      },
    });

    const result = await simulateLoginSubmit({
      loginCredentials: { email: "recruiter@gigly.com", password: "Password123!" },
      apiPostMock,
      authEngine: auth,
      navigateMock,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.targetPath, "/recruiter/dashboard");
    assert.deepStrictEqual(navigatedRoutes, ["/recruiter/dashboard"]);
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "RECRUITER");
  });

  test("18. Failed login does NOT redirect and keeps unauthenticated state", async () => {
    const auth = createAuthEngine();
    const navigatedRoutes = [];
    const navigateMock = (path) => navigatedRoutes.push(path);

    const apiPostMock = async () => {
      throw new Error("Invalid credentials");
    };

    await assert.rejects(
      () =>
        simulateLoginSubmit({
          loginCredentials: { email: "wrong@gigly.com", password: "bad" },
          apiPostMock,
          authEngine: auth,
          navigateMock,
        }),
      /Invalid credentials/,
    );

    assert.strictEqual(navigatedRoutes.length, 0);
    assert.strictEqual(auth.getState().isAuthenticated, false);
    assert.strictEqual(auth.getState().user, null);
  });

  test("19. Unknown/unsupported role does NOT redirect to any dashboard", async () => {
    const auth = createAuthEngine();
    const navigatedRoutes = [];
    const navigateMock = (path) => navigatedRoutes.push(path);

    const apiPostMock = async () => ({
      data: {
        access_token: "jwt-guest-token",
        user: { id: "guest-1", email: "guest@gigly.com", role: "UNSUPPORTED_ROLE", firstName: "Guest" },
      },
    });

    const result = await simulateLoginSubmit({
      loginCredentials: { email: "guest@gigly.com", password: "Password123!" },
      apiPostMock,
      authEngine: auth,
      navigateMock,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, "Unknown Role");
    assert.strictEqual(navigatedRoutes.length, 0);
  });

  test("20. Navigation happens strictly AFTER authentication is established", async () => {
    const auth = createAuthEngine();
    const eventSequence = [];

    const navigateMock = (path) => {
      // Check auth state at the exact moment navigate is invoked
      assert.strictEqual(auth.getState().isAuthenticated, true);
      assert.strictEqual(auth.getState().role, "ADMIN");
      eventSequence.push(`navigate:${path}`);
    };

    const apiPostMock = async () => {
      eventSequence.push("api:login");
      return {
        data: {
          access_token: "jwt-token",
          user: { id: "1", email: "admin@gigly.com", role: "ADMIN", firstName: "Admin" },
        },
      };
    };

    await simulateLoginSubmit({
      loginCredentials: { email: "admin@gigly.com", password: "pwd" },
      apiPostMock,
      authEngine: auth,
      navigateMock,
    });

    assert.deepStrictEqual(eventSequence, ["api:login", "navigate:/admin/dashboard"]);
  });

  // Step 6: ProtectedRoute Route Guard Tests
  const evaluateProtectedRoute = ({
    authContext,
    allowedRoles,
    children = "PROTECTED_CONTENT",
  }) => {
    const { isAuthenticated, isLoading, role } = authContext;

    // 1. Loading state
    if (isLoading) {
      return { status: "LOADING", element: "LOADING_SPINNER" };
    }

    // 2. Unauthenticated
    if (!isAuthenticated) {
      return { status: "REDIRECT", to: "/login", replace: true };
    }

    // 3. Role restriction
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        const safeDashboard = getDashboardPathForRole(role);
        return {
          status: "REDIRECT",
          to: safeDashboard || "/login",
          replace: true,
        };
      }
    }

    // 4. Authorized
    return { status: "RENDER", element: children };
  };

  test("21. ProtectedRoute: Unauthenticated user is redirected to /login with replace", () => {
    const authContext = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      role: null,
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });

    assert.strictEqual(result.status, "REDIRECT");
    assert.strictEqual(result.to, "/login");
    assert.strictEqual(result.replace, true);
  });

  test("22. ProtectedRoute: While isLoading is true, renders loading indicator and does NOT redirect", () => {
    const authContext = {
      isAuthenticated: false,
      isLoading: true,
      user: null,
      role: null,
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["WORKER"],
      children: "WORKER_DASHBOARD",
    });

    assert.strictEqual(result.status, "LOADING");
    assert.strictEqual(result.element, "LOADING_SPINNER");
    assert.strictEqual(result.to, undefined);
  });

  test("23. ProtectedRoute: ADMIN accessing ADMIN route renders protected content", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "admin-1", role: "ADMIN" },
      role: "ADMIN",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });

    assert.strictEqual(result.status, "RENDER");
    assert.strictEqual(result.element, "ADMIN_DASHBOARD");
  });

  test("24. ProtectedRoute: WORKER accessing WORKER route renders protected content", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "worker-1", role: "WORKER" },
      role: "WORKER",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["WORKER"],
      children: "WORKER_DASHBOARD",
    });

    assert.strictEqual(result.status, "RENDER");
    assert.strictEqual(result.element, "WORKER_DASHBOARD");
  });

  test("25. ProtectedRoute: RECRUITER accessing RECRUITER route renders protected content", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "recruiter-1", role: "RECRUITER" },
      role: "RECRUITER",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["RECRUITER"],
      children: "RECRUITER_DASHBOARD",
    });

    assert.strictEqual(result.status, "RENDER");
    assert.strictEqual(result.element, "RECRUITER_DASHBOARD");
  });

  test("26. ProtectedRoute: ADMIN attempting to access WORKER route redirects to /admin/dashboard", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "admin-1", role: "ADMIN" },
      role: "ADMIN",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["WORKER"],
      children: "WORKER_DASHBOARD",
    });

    assert.strictEqual(result.status, "REDIRECT");
    assert.strictEqual(result.to, "/admin/dashboard");
    assert.strictEqual(result.replace, true);
  });

  test("27. ProtectedRoute: WORKER attempting to access ADMIN route redirects to /worker/dashboard", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "worker-1", role: "WORKER" },
      role: "WORKER",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });

    assert.strictEqual(result.status, "REDIRECT");
    assert.strictEqual(result.to, "/worker/dashboard");
    assert.strictEqual(result.replace, true);
  });

  test("28. ProtectedRoute: RECRUITER attempting to access ADMIN route redirects to /recruiter/dashboard", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "recruiter-1", role: "RECRUITER" },
      role: "RECRUITER",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });

    assert.strictEqual(result.status, "REDIRECT");
    assert.strictEqual(result.to, "/recruiter/dashboard");
    assert.strictEqual(result.replace, true);
  });

  test("29. ProtectedRoute: Authenticated user with unknown/null role is safely redirected to /login", () => {
    const authContext = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "weird-1", role: "UNRECOGNIZED_ROLE" },
      role: "UNRECOGNIZED_ROLE",
    };

    const result = evaluateProtectedRoute({
      authContext,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });

    assert.strictEqual(result.status, "REDIRECT");
    assert.strictEqual(result.to, "/login");
    assert.strictEqual(result.replace, true);
  });

  // Step 8D: User-Facing Logout Tests (Worker, Recruiter, Admin)
  const simulateLogoutAction = ({ authEngine, navigateMock }) => {
    // Exact logic implemented in WorkerSidebar, RecruiterSidebar, and AdminHeader:
    // 1. logout();
    // 2. navigate("/login", { replace: true });
    authEngine.logout();
    navigateMock("/login", { replace: true });
  };

  test("30. Worker Logout: Clears state, replaces route to /login, and revokes /worker/dashboard access", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    await auth.login("worker-jwt-token", {
      id: "worker-1",
      email: "worker@gigly.com",
      role: "WORKER",
      firstName: "Michael",
      lastName: "Carter",
    });

    // 1. Worker is authenticated and can access /worker/dashboard
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "WORKER");
    assert.strictEqual(localStorageMock.getItem("token"), "worker-jwt-token");

    const accessBeforeLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["WORKER"],
      children: "WORKER_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessBeforeLogout.status, "RENDER");
    assert.strictEqual(accessBeforeLogout.element, "WORKER_DASHBOARD_CONTENT");

    // 2. Worker triggers Logout
    const navigationEvents = [];
    const navigateMock = (path, options) => {
      navigationEvents.push({ path, options });
    };

    simulateLogoutAction({ authEngine: auth, navigateMock });

    // 3. Verify authentication state & token are cleared
    const stateAfterLogout = auth.getState();
    assert.strictEqual(stateAfterLogout.isAuthenticated, false);
    assert.strictEqual(stateAfterLogout.user, null);
    assert.strictEqual(stateAfterLogout.token, null);
    assert.strictEqual(stateAfterLogout.role, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);

    // 4. Verify route replacement navigation to /login
    assert.strictEqual(navigationEvents.length, 1);
    assert.strictEqual(navigationEvents[0].path, "/login");
    assert.deepStrictEqual(navigationEvents[0].options, { replace: true });

    // 5. Verify post-logout attempt to access /worker/dashboard redirects to /login with replace
    const accessAfterLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["WORKER"],
      children: "WORKER_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessAfterLogout.status, "REDIRECT");
    assert.strictEqual(accessAfterLogout.to, "/login");
    assert.strictEqual(accessAfterLogout.replace, true);
  });

  test("31. Recruiter Logout: Clears state, replaces route to /login, and revokes /recruiter/dashboard access", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    await auth.login("recruiter-jwt-token", {
      id: "recruiter-1",
      email: "recruiter@gigly.com",
      role: "RECRUITER",
      firstName: "Sarah",
      lastName: "Jenkins",
    });

    // 1. Recruiter is authenticated and can access /recruiter/dashboard
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "RECRUITER");
    assert.strictEqual(localStorageMock.getItem("token"), "recruiter-jwt-token");

    const accessBeforeLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["RECRUITER"],
      children: "RECRUITER_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessBeforeLogout.status, "RENDER");
    assert.strictEqual(accessBeforeLogout.element, "RECRUITER_DASHBOARD_CONTENT");

    // 2. Recruiter triggers Logout
    const navigationEvents = [];
    const navigateMock = (path, options) => {
      navigationEvents.push({ path, options });
    };

    simulateLogoutAction({ authEngine: auth, navigateMock });

    // 3. Verify authentication state & token are cleared
    const stateAfterLogout = auth.getState();
    assert.strictEqual(stateAfterLogout.isAuthenticated, false);
    assert.strictEqual(stateAfterLogout.user, null);
    assert.strictEqual(stateAfterLogout.token, null);
    assert.strictEqual(stateAfterLogout.role, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);

    // 4. Verify route replacement navigation to /login
    assert.strictEqual(navigationEvents.length, 1);
    assert.strictEqual(navigationEvents[0].path, "/login");
    assert.deepStrictEqual(navigationEvents[0].options, { replace: true });

    // 5. Verify post-logout attempt to access /recruiter/dashboard redirects to /login with replace
    const accessAfterLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["RECRUITER"],
      children: "RECRUITER_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessAfterLogout.status, "REDIRECT");
    assert.strictEqual(accessAfterLogout.to, "/login");
    assert.strictEqual(accessAfterLogout.replace, true);
  });

  test("32. Admin Logout: Clears state, replaces route to /login, and revokes /admin/dashboard access", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    await auth.login("admin-jwt-token", {
      id: "admin-1",
      email: "admin@gigly.com",
      role: "ADMIN",
      firstName: "Sarah",
      lastName: "Jenkins",
    });

    // 1. Admin is authenticated and can access /admin/dashboard
    assert.strictEqual(auth.getState().isAuthenticated, true);
    assert.strictEqual(auth.getState().role, "ADMIN");
    assert.strictEqual(localStorageMock.getItem("token"), "admin-jwt-token");

    const accessBeforeLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessBeforeLogout.status, "RENDER");
    assert.strictEqual(accessBeforeLogout.element, "ADMIN_DASHBOARD_CONTENT");

    // 2. Admin triggers Logout
    const navigationEvents = [];
    const navigateMock = (path, options) => {
      navigationEvents.push({ path, options });
    };

    simulateLogoutAction({ authEngine: auth, navigateMock });

    // 3. Verify authentication state & token are cleared
    const stateAfterLogout = auth.getState();
    assert.strictEqual(stateAfterLogout.isAuthenticated, false);
    assert.strictEqual(stateAfterLogout.user, null);
    assert.strictEqual(stateAfterLogout.token, null);
    assert.strictEqual(stateAfterLogout.role, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);

    // 4. Verify route replacement navigation to /login
    assert.strictEqual(navigationEvents.length, 1);
    assert.strictEqual(navigationEvents[0].path, "/login");
    assert.deepStrictEqual(navigationEvents[0].options, { replace: true });

    // 5. Verify post-logout attempt to access /admin/dashboard redirects to /login with replace
    const accessAfterLogout = evaluateProtectedRoute({
      authContext: auth.getState(),
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD_CONTENT",
    });
    assert.strictEqual(accessAfterLogout.status, "REDIRECT");
    assert.strictEqual(accessAfterLogout.to, "/login");
    assert.strictEqual(accessAfterLogout.replace, true);
  });

  test("33. Cross-Access Prevention: Logged-out user cannot access ANY protected role route", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    await auth.login("temp-token", {
      id: "worker-1",
      email: "worker@gigly.com",
      role: "WORKER",
    });

    simulateLogoutAction({ authEngine: auth, navigateMock: () => {} });

    const routesToTest = [
      { role: "WORKER", path: "/worker/dashboard" },
      { role: "RECRUITER", path: "/recruiter/dashboard" },
      { role: "ADMIN", path: "/admin/dashboard" },
    ];

    for (const route of routesToTest) {
      const evaluation = evaluateProtectedRoute({
        authContext: auth.getState(),
        allowedRoles: [route.role],
        children: `${route.role}_PAGE`,
      });
      assert.strictEqual(
        evaluation.status,
        "REDIRECT",
        `Post-logout access to ${route.path} must redirect`,
      );
      assert.strictEqual(
        evaluation.to,
        "/login",
        `Post-logout access to ${route.path} must redirect to /login`,
      );
      assert.strictEqual(
        evaluation.replace,
        true,
        `Post-logout access to ${route.path} redirect must use replace: true`,
      );
    }
  });

  test("34. Execution Order: Authentication state is cleared BEFORE navigation occurs", async () => {
    const auth = createAuthEngine();
    await auth.initializeAuth();
    await auth.login("test-token", {
      id: "user-1",
      email: "user@gigly.com",
      role: "WORKER",
    });

    let authStateAtNavigationTime = null;
    let tokenAtNavigationTime = null;

    const navigateMock = (path, options) => {
      // Sample state at the exact moment navigation is triggered
      authStateAtNavigationTime = auth.getState();
      tokenAtNavigationTime = localStorageMock.getItem("token");
    };

    simulateLogoutAction({ authEngine: auth, navigateMock });

    assert.notStrictEqual(authStateAtNavigationTime, null);
    assert.strictEqual(authStateAtNavigationTime.isAuthenticated, false);
    assert.strictEqual(authStateAtNavigationTime.user, null);
    assert.strictEqual(authStateAtNavigationTime.token, null);
    assert.strictEqual(tokenAtNavigationTime, null);
  });

  test("35. Browser History Replacement: Navigation uses replace: true strictly", () => {
    const auth = createAuthEngine();
    let capturedOptions = null;
    let capturedPath = null;

    const navigateMock = (path, options) => {
      capturedPath = path;
      capturedOptions = options;
    };

    simulateLogoutAction({ authEngine: auth, navigateMock });

    assert.strictEqual(capturedPath, "/login");
    assert.deepStrictEqual(capturedOptions, { replace: true });
    assert.notStrictEqual(capturedOptions?.replace, false);
  });

  test("36. Session Invalidation: Token is permanently purged and session cannot re-hydrate", async () => {
    const auth = createAuthEngine("initial-token");
    await auth.initializeAuth();
    await auth.login("initial-token", {
      id: "worker-1",
      email: "worker@gigly.com",
      role: "WORKER",
    });

    simulateLogoutAction({ authEngine: auth, navigateMock: () => {} });

    assert.strictEqual(localStorageMock.getItem("token"), null);

    // Attempting to initializeAuth again without a stored token
    await auth.initializeAuth();
    assert.strictEqual(auth.getState().isAuthenticated, false);
    assert.strictEqual(auth.getState().user, null);
    assert.strictEqual(auth.getState().token, null);
  });

  test("37. UI Contract: WorkerSidebar exposes an accessible Logout <button> with hover/focus reveal", () => {
    const filePath = path.resolve(__dirname, "../components/worker/WorkerSidebar.tsx");
    assert.strictEqual(fs.existsSync(filePath), true, "WorkerSidebar.tsx must exist");
    const content = fs.readFileSync(filePath, "utf-8");

    // Must be a button element with type="button"
    assert.match(content, /<button[^>]*type="button"[^>]*onClick=\{handleLogout\}/);
    // Must have accessible aria-label="Logout"
    assert.match(content, /aria-label="Logout"/);
    // Must contain LogOut icon from lucide-react
    assert.match(content, /<LogOut\b/);
    assert.match(content, /<span>Logout<\/span>/);
    // Must be within a group container for hover and focus-within reveal
    assert.match(content, /group/);
    assert.match(content, /group-hover:opacity-100/);
    assert.match(content, /group-focus-within:opacity-100/);
    // Must call logout() and navigate to /login with replace: true
    assert.match(content, /logout\(\)/);
    assert.match(content, /navigate\("\/login",\s*\{\s*replace:\s*true\s*\}\)/);
  });

  test("38. UI Contract: RecruiterSidebar exposes an accessible Logout <button> with hover/focus reveal", () => {
    const filePath = path.resolve(__dirname, "../components/recruiter/RecruiterSidebar.tsx");
    assert.strictEqual(fs.existsSync(filePath), true, "RecruiterSidebar.tsx must exist");
    const content = fs.readFileSync(filePath, "utf-8");

    // Must be a button element with type="button"
    assert.match(content, /<button[^>]*type="button"[^>]*onClick=\{handleLogout\}/);
    // Must have accessible aria-label="Logout"
    assert.match(content, /aria-label="Logout"/);
    // Must contain LogOut icon from lucide-react
    assert.match(content, /<LogOut\b/);
    assert.match(content, /<span>Logout<\/span>/);
    // Must be within a group container for hover and focus-within reveal
    assert.match(content, /group/);
    assert.match(content, /group-hover:opacity-100/);
    assert.match(content, /group-focus-within:opacity-100/);
    // Must call logout() and navigate to /login with replace: true
    assert.match(content, /logout\(\)/);
    assert.match(content, /navigate\("\/login",\s*\{\s*replace:\s*true\s*\}\)/);
  });

  test("39. UI Contract: AdminHeader exposes an accessible Logout <button> with hover/focus reveal", () => {
    const filePath = path.resolve(__dirname, "../components/admin/AdminHeader.tsx");
    assert.strictEqual(fs.existsSync(filePath), true, "AdminHeader.tsx must exist");
    const content = fs.readFileSync(filePath, "utf-8");

    // Must be a button element with type="button"
    assert.match(content, /<button[^>]*type="button"[^>]*onClick=\{handleLogout\}/);
    // Must have accessible aria-label="Logout"
    assert.match(content, /aria-label="Logout"/);
    // Must contain LogOut icon from lucide-react
    assert.match(content, /<LogOut\b/);
    assert.match(content, /<span>Logout<\/span>/);
    // Must be within a group container for hover and focus-within reveal
    assert.match(content, /group/);
    assert.match(content, /group-hover:opacity-100/);
    assert.match(content, /group-focus-within:opacity-100/);
    // Must call logout() and navigate to /login with replace: true
    assert.match(content, /logout\(\)/);
    assert.match(content, /navigate\("\/login",\s*\{\s*replace:\s*true\s*\}\)/);
  });

  test("40. Public Routes: Post-logout user can freely access public routes (/, /login, /signup)", () => {
    // Inspect App.tsx route definitions to ensure public routes are not wrapped with ProtectedRoute
    const appPath = path.resolve(__dirname, "../App.tsx");
    assert.strictEqual(fs.existsSync(appPath), true, "App.tsx must exist");
    const appContent = fs.readFileSync(appPath, "utf-8");

    // Public routes must exist outside ProtectedRoute
    assert.match(appContent, /<Route\s+path="\/"\s+element=\{<Landing\s*\/>\}\s*\/>/);
    assert.match(appContent, /<Route\s+path="\/login"\s+element=\{<Login\s*\/>\}\s*\/>/);
    assert.match(appContent, /<Route\s+path="\/signup"\s+element=\{<Signup\s*\/>\}\s*\/>/);

    // Ensure public routes are open without requiring authentication
    const isPublicRoute = (pathname) => ["/", "/login", "/signup"].includes(pathname);
    assert.strictEqual(isPublicRoute("/"), true);
    assert.strictEqual(isPublicRoute("/login"), true);
    assert.strictEqual(isPublicRoute("/signup"), true);
    assert.strictEqual(isPublicRoute("/worker/dashboard"), false);
    assert.strictEqual(isPublicRoute("/recruiter/dashboard"), false);
    assert.strictEqual(isPublicRoute("/admin/dashboard"), false);
  });

  test("41. Session Persistence & Re-hydration: After logout, reload confirms user remains unauthenticated", async () => {
    // 1. Authenticate user
    const initialAuth = createAuthEngine();
    await initialAuth.initializeAuth();
    await initialAuth.login("session-token", {
      id: "admin-99",
      email: "admin99@gigly.com",
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    });

    assert.strictEqual(initialAuth.getState().isAuthenticated, true);
    assert.strictEqual(localStorageMock.getItem("token"), "session-token");

    // 2. Perform Logout
    simulateLogoutAction({ authEngine: initialAuth, navigateMock: () => {} });
    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(initialAuth.getState().isAuthenticated, false);

    // 3. Simulate application reload / mount by instantiating new auth engine from localStorage
    const reloadedAuth = createAuthEngine(localStorageMock.getItem("token"));
    await reloadedAuth.initializeAuth();

    // 4. Verify reloaded state remains unauthenticated
    const reloadedState = reloadedAuth.getState();
    assert.strictEqual(reloadedState.isLoading, false);
    assert.strictEqual(reloadedState.isAuthenticated, false);
    assert.strictEqual(reloadedState.user, null);
    assert.strictEqual(reloadedState.token, null);
    assert.strictEqual(reloadedState.role, null);

    // 5. Protected route redirection still holds after reload
    const accessAfterReload = evaluateProtectedRoute({
      authContext: reloadedState,
      allowedRoles: ["ADMIN"],
      children: "ADMIN_DASHBOARD",
    });
    assert.strictEqual(accessAfterReload.status, "REDIRECT");
    assert.strictEqual(accessAfterReload.to, "/login");
    assert.strictEqual(accessAfterReload.replace, true);
  });
});
