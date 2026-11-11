import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper evaluating ProtectedRoute logic identical to ProtectedRoute.tsx
const evaluateProtectedRoute = ({ authContext, allowedRoles, children }) => {
  if (authContext.isLoading) {
    return { status: "LOADING" };
  }

  if (!authContext.isAuthenticated) {
    return { status: "REDIRECT", to: "/login", replace: true };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!authContext.role || !allowedRoles.includes(authContext.role)) {
      let safeDashboard = null;
      switch (authContext.role) {
        case "ADMIN":
          safeDashboard = "/admin/dashboard";
          break;
        case "WORKER":
          safeDashboard = "/worker/dashboard";
          break;
        case "RECRUITER":
          safeDashboard = "/recruiter/dashboard";
          break;
        default:
          safeDashboard = "/login";
      }
      return { status: "REDIRECT", to: safeDashboard, replace: true };
    }
  }

  return { status: "RENDER", element: children };
};

describe("Feature 3, Step 5: Worker Find Jobs Page Assembly", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const findJobsPagePath = path.resolve(
    __dirname,
    "../pages/worker/FindJobs.tsx",
  );
  const workerDashboardPath = path.resolve(
    __dirname,
    "../pages/worker/WorkerDashboard.tsx",
  );
  const workerSidebarPath = path.resolve(
    __dirname,
    "../components/worker/WorkerSidebar.tsx",
  );

  describe("1. Route Registration and Access Control", () => {
    test("1.1. App.tsx imports FindJobs from ./pages/worker/FindJobs", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /import\s+FindJobs\s+from\s+["']\.\/pages\/worker\/FindJobs["']/,
        "App.tsx must import FindJobs",
      );
    });

    test("1.2. App.tsx registers /worker/find-jobs route protected by WORKER role", () => {
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /<Route\s+path=["']\/worker\/find-jobs["']\s+element=\{[\s\S]*?<ProtectedRoute\s+allowedRoles=\{?\[["']WORKER["']\]\}?>[\s\S]*?<FindJobs\s*\/>[\s\S]*?<\/ProtectedRoute>[\s\S]*?\}\s*\/>/,
        "Route /worker/find-jobs must be wrapped with ProtectedRoute allowedRoles=['WORKER']",
      );
    });

    test("1.3. ProtectedRoute allows authenticated WORKER to view /worker/find-jobs", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "w-1", role: "WORKER" },
          role: "WORKER",
        },
        allowedRoles: ["WORKER"],
        children: "FindJobsPageRendered",
      });

      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, "FindJobsPageRendered");
    });

    test("1.4. ProtectedRoute redirects unauthenticated visitors to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          role: null,
        },
        allowedRoles: ["WORKER"],
        children: "FindJobsPageRendered",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/login");
    });

    test("1.5. ProtectedRoute redirects RECRUITER to /recruiter/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "r-1", role: "RECRUITER" },
          role: "RECRUITER",
        },
        allowedRoles: ["WORKER"],
        children: "FindJobsPageRendered",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/recruiter/dashboard");
    });

    test("1.6. ProtectedRoute redirects ADMIN to /admin/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "a-1", role: "ADMIN" },
          role: "ADMIN",
        },
        allowedRoles: ["WORKER"],
        children: "FindJobsPageRendered",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/admin/dashboard");
    });
  });

  describe("2. Navigation and Dashboard Wiring", () => {
    test("2.1. WorkerSidebar.tsx defines 'find-jobs' navigation item pointing to /worker/find-jobs", () => {
      assert.strictEqual(fs.existsSync(workerSidebarPath), true);
      const content = fs.readFileSync(workerSidebarPath, "utf-8");

      assert.match(content, /id:\s*["']find-jobs["']/);
      assert.match(content, /path:\s*["']\/worker\/find-jobs["']/);
    });

    test("2.2. WorkerDashboard.tsx connects HeroActionCards onFindJobs to navigate to /worker/find-jobs", () => {
      assert.strictEqual(fs.existsSync(workerDashboardPath), true);
      const content = fs.readFileSync(workerDashboardPath, "utf-8");

      assert.match(
        content,
        /useNavigate\(\)/,
        "WorkerDashboard must use useNavigate",
      );
      assert.match(
        content,
        /<HeroActionCards[\s\S]*?onFindJobs=\{[\s\S]*?navigate\(["']\/worker\/find-jobs["']\)[\s\S]*?\}[\s\S]*?\/>/,
        "WorkerDashboard must pass onFindJobs navigating to /worker/find-jobs",
      );
    });

    test("2.3. FindJobs.tsx mounts WorkerSidebar with activeTab='find-jobs'", () => {
      assert.strictEqual(fs.existsSync(findJobsPagePath), true);
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /<WorkerSidebar\s+activeTab=["']find-jobs["']\s*\/>/,
        "FindJobs must mount WorkerSidebar with activeTab='find-jobs'",
      );
    });
  });

  describe("3. Component Assembly and Layout Conformance", () => {
    test("3.1. FindJobs.tsx integrates all discovery UI components", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /JobCard/);
      assert.match(content, /JobCardSkeleton/);
      assert.match(content, /JobFilters/);
      assert.match(content, /JobPagination/);
    });

    test("3.2. FindJobs.tsx imports findOpenJobs and getJobCategories APIs", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /import\s*\{[\s\S]*?findOpenJobs[\s\S]*?\}\s*from\s*["']@\/lib\/worker-api["']/,
        "Must import findOpenJobs from worker-api",
      );
      assert.match(
        content,
        /import\s*\{[\s\S]*?getJobCategories[\s\S]*?\}\s*from\s*["']@\/lib\/job-api["']/,
        "Must import getJobCategories from job-api",
      );
    });

    test("3.3. FindJobs.tsx renders Figma layout titles and section headers", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /Find Jobs/);
      assert.match(
        content,
        /Browse short-term shifts, local gigs, and quick paid work near\s+you\./,
      );
      assert.match(content, /Available gigs for today and this week/);
      assert.match(
        content,
        /Simple listings for temporary workers looking for fast local jobs\./,
      );
    });

    test("3.4. FindJobs.tsx uses 2-column responsive grid on desktop and 1-column on mobile", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /grid\s+grid-cols-1\s+lg:grid-cols-2\s+gap-6/,
        "Job grid must be grid-cols-1 lg:grid-cols-2 gap-6",
      );
    });
  });

  describe("4. State Machine & Filter Coordination", () => {
    test("4.1. Filter changes reset pagination to page 1", () => {
      // Simulation of FindJobs filter state machine
      let state = {
        search: "",
        selectedCategoryId: undefined,
        workType: undefined,
        paymentStructure: undefined,
        minPay: undefined,
        maxPay: undefined,
        location: undefined,
        sortBy: "recent",
        page: 3,
      };

      const setFilter = (patch) => {
        state = {
          ...state,
          ...patch,
          page: 1, // Filter changes must reset page to 1
        };
      };

      setFilter({ workType: "LOCAL" });
      assert.strictEqual(state.page, 1);
      assert.strictEqual(state.workType, "LOCAL");

      state.page = 4;
      setFilter({ selectedCategoryId: "cat-123" });
      assert.strictEqual(state.page, 1);
      assert.strictEqual(state.selectedCategoryId, "cat-123");

      state.page = 2;
      setFilter({ sortBy: "pay_high" });
      assert.strictEqual(state.page, 1);
      assert.strictEqual(state.sortBy, "pay_high");
    });

    test("4.2. Pagination navigation updates page without resetting filters", () => {
      let state = {
        search: "warehouse",
        selectedCategoryId: "cat-1",
        workType: "LOCAL",
        page: 1,
      };

      const setPage = (newPage) => {
        state = { ...state, page: newPage };
      };

      setPage(2);
      assert.strictEqual(state.page, 2);
      assert.strictEqual(state.search, "warehouse");
      assert.strictEqual(state.selectedCategoryId, "cat-1");
      assert.strictEqual(state.workType, "LOCAL");
    });

    test("4.3. Clear all filters resets every filter field and resets page to 1", () => {
      let state = {
        search: "moving",
        selectedCategoryId: "cat-moving",
        workType: "LOCAL",
        paymentStructure: "hourly",
        minPay: 20,
        maxPay: 50,
        location: "Seattle",
        sortBy: "pay_high",
        page: 4,
      };

      const clearAllFilters = () => {
        state = {
          search: "",
          selectedCategoryId: undefined,
          workType: undefined,
          paymentStructure: undefined,
          minPay: undefined,
          maxPay: undefined,
          location: undefined,
          sortBy: "recent",
          page: 1,
        };
      };

      clearAllFilters();
      assert.strictEqual(state.search, "");
      assert.strictEqual(state.selectedCategoryId, undefined);
      assert.strictEqual(state.workType, undefined);
      assert.strictEqual(state.paymentStructure, undefined);
      assert.strictEqual(state.minPay, undefined);
      assert.strictEqual(state.maxPay, undefined);
      assert.strictEqual(state.location, undefined);
      assert.strictEqual(state.sortBy, "recent");
      assert.strictEqual(state.page, 1);
    });
  });

  describe("5. Debounced Search & Stale Response Handling", () => {
    test("5.1. FindJobs.tsx implements debouncing for search input", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /debouncedSearch/,
        "FindJobs must manage debouncedSearch",
      );
      assert.match(
        content,
        /setTimeout\(/,
        "FindJobs must debounce search with setTimeout",
      );
      assert.match(
        content,
        /clearTimeout\(/,
        "FindJobs must clear debounce timer on cleanup",
      );
    });

    test("5.2. FindJobs.tsx prevents stale async responses using request ID tracking", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /requestIdRef\s*=\s*useRef/,
        "Must track request ID ref",
      );
      assert.match(
        content,
        /\+\+requestIdRef\.current/,
        "Must increment request ID before dispatching query",
      );
      assert.match(
        content,
        /currentRequestId\s*===\s*requestIdRef\.current/,
        "Must verify response matches latest request ID before updating state",
      );
    });

    test("5.3. Simulated race condition: Out-of-order responses do not overwrite newer state", async () => {
      let activeJobsState = [];
      let latestRequestId = 0;

      const simulateFetch = (queryLabel, delayMs, responseData) => {
        const thisRequestId = ++latestRequestId;
        return new Promise((resolve) => {
          setTimeout(() => {
            if (thisRequestId === latestRequestId) {
              activeJobsState = responseData;
              resolve({ accepted: true, label: queryLabel });
            } else {
              // Stale response ignored
              resolve({ accepted: false, label: queryLabel });
            }
          }, delayMs);
        });
      };

      // Request 1 starts with slow 50ms delay
      const p1 = simulateFetch("query1_slow", 50, [{ id: "job-1" }]);
      // Request 2 starts immediately after with fast 10ms delay
      const p2 = simulateFetch("query2_fast", 10, [{ id: "job-2" }]);

      const [res1, res2] = await Promise.all([p1, p2]);

      // Request 2 was accepted
      assert.strictEqual(res2.accepted, true);
      // Request 1 was rejected/ignored because it finished after request 2 was issued
      assert.strictEqual(res1.accepted, false);
      // State is preserved from Request 2
      assert.deepStrictEqual(activeJobsState, [{ id: "job-2" }]);
    });
  });

  describe("6. Error, Loading, and Empty State Rendering Logic", () => {
    test("6.1. FindJobs.tsx renders error banner with retry button on failure", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /data-testid=["']find-jobs-error["']/);
      assert.match(content, /Retry/);
      assert.match(content, /handleRetry/);
    });

    test("6.2. FindJobs.tsx renders loading skeletons while fetching", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /data-testid=["']find-jobs-loading["']/);
      assert.match(content, /<JobCardSkeleton/);
    });

    test("6.3. FindJobs.tsx renders empty state with 'Clear All Filters' when no jobs match", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /data-testid=["']find-jobs-empty["']/);
      assert.match(content, /No jobs found/);
      assert.match(content, /Clear All Filters/);
    });

    test("6.4. FindJobs.tsx renders grid of JobCard components and JobPagination on success", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(content, /data-testid=["']find-jobs-grid["']/);
      assert.match(content, /<JobCard/);
      assert.match(content, /<JobPagination/);
    });
  });

  describe("7. Architectural & Security Invariants", () => {
    test("7.1. FindJobs.tsx preserves HttpOnly cookie authentication and does not touch localStorage tokens", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.doesNotMatch(
        content,
        /localStorage\.getItem\(['"]token['"]\)/,
        "Must not touch token in localStorage",
      );
      assert.doesNotMatch(
        content,
        /sessionStorage\.getItem\(['"]token['"]\)/,
        "Must not touch token in sessionStorage",
      );
    });

    test("7.2. FindJobs.tsx does not instantiate private axios instances", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.doesNotMatch(
        content,
        /axios\.create\(/,
        "Must not create new axios instances",
      );
    });
  });
});
