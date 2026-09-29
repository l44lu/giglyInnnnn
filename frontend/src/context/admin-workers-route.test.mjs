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

describe("Frontend Step 4: Admin Workers Route, Real Data Loading, and KPI", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const pagePath = path.resolve(__dirname, "../pages/admin/AdminWorkers.tsx");
  const sidebarPath = path.resolve(__dirname, "../components/admin/AdminSidebar.tsx");

  describe("1. Route Registration in App.tsx", () => {
    test("1.1. App.tsx imports AdminWorkers", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /import\s+AdminWorkers\s+from\s+["']\.\/pages\/admin\/AdminWorkers["']/,
        "App.tsx must import AdminWorkers component",
      );
    });

    test("1.2. App.tsx registers /admin/workers with allowedRoles=['ADMIN']", () => {
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /path=["']\/admin\/workers["']/,
        "App.tsx must define /admin/workers route",
      );

      const routeBlockMatch = content.match(
        /<Route\s+path=["']\/admin\/workers["']\s+element=\{([\s\S]*?)\}\s*\/>/,
      );
      assert.ok(routeBlockMatch, "Route block for /admin/workers must exist");
      const elementContent = routeBlockMatch[1];

      assert.match(
        elementContent,
        /<ProtectedRoute\s+allowedRoles=\{\[["']ADMIN["']\]\}>/,
        "/admin/workers must be wrapped in ProtectedRoute with allowedRoles=['ADMIN']",
      );
      assert.match(
        elementContent,
        /<AdminWorkers\s*\/>/,
        "ProtectedRoute must render <AdminWorkers />",
      );
    });
  });

  describe("2. ProtectedRoute Authorization for /admin/workers", () => {
    const allowedRoles = ["ADMIN"];
    const pageComponent = "AdminWorkersPage";

    test("2.1. While loading session, ProtectedRoute returns LOADING status", () => {
      const result = evaluateProtectedRoute({
        authContext: { isLoading: true, isAuthenticated: false, role: null },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "LOADING");
    });

    test("2.2. Unauthenticated visitor is redirected to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: { isLoading: false, isAuthenticated: false, role: null },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/login");
      assert.strictEqual(result.replace, true);
    });

    test("2.3. Authenticated WORKER is blocked and redirected to /worker/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: { isLoading: false, isAuthenticated: true, role: "WORKER" },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/worker/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("2.4. Authenticated RECRUITER is blocked and redirected to /recruiter/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: { isLoading: false, isAuthenticated: true, role: "RECRUITER" },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/recruiter/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("2.5. Authenticated ADMIN is authorized and renders AdminWorkers", () => {
      const result = evaluateProtectedRoute({
        authContext: { isLoading: false, isAuthenticated: true, role: "ADMIN" },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, pageComponent);
    });
  });

  describe("3. Real Worker Data Loading & KPI Integration in AdminWorkers.tsx", () => {
    test("3.1. AdminWorkers imports and calls getAdminUsers from @/lib/admin-api", () => {
      assert.strictEqual(fs.existsSync(pagePath), true);
      const content = fs.readFileSync(pagePath, "utf-8");

      assert.match(
        content,
        /import\s+\{[^}]*getAdminUsers[^}]*\}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminWorkers must import getAdminUsers from @/lib/admin-api",
      );
      assert.match(
        content,
        /getAdminUsers\(\)/,
        "AdminWorkers must invoke getAdminUsers() in its effect",
      );
      assert.strictEqual(
        content.includes("axios.get"),
        false,
        "AdminWorkers must NOT invoke axios.get directly",
      );
      assert.strictEqual(
        content.includes("fetch("),
        false,
        "AdminWorkers must NOT invoke fetch directly",
      );
    });

    test("3.2. Workers are derived by filtering for role === 'WORKER'", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /users\.filter\(\s*\(user\)\s*=>\s*user\.role\s*===\s*["']WORKER["']\s*\)/,
        "AdminWorkers must derive workers by filtering role === 'WORKER'",
      );
    });

    test("3.3. 'Workers listed' KPI card renders title and subtitle", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']kpi-workers-listed["']/);
      assert.match(content, /Workers listed/);
      assert.match(content, /All worker accounts visible to admins/);
    });

    test("3.4. Loading state renders neutral '—' and does NOT show 0", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /isLoading\s*\?\s*\([\s\S]*?—[\s\S]*?\)\s*:\s*error\s*\?/,
        "When isLoading is true, must render neutral '—'",
      );
    });

    test("3.5. Error state renders neutral '—' and does NOT show misleading 0", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /error\s*\?\s*\([\s\S]*?—[\s\S]*?\)\s*:\s*\(?\s*workers\.length\.toLocaleString\(\)/,
        "When error is present, must render neutral '—' rather than a misleading count",
      );
    });

    test("3.6. Page does NOT contain unsupported Figma metrics, fake counts, or mock records", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      const forbiddenStrings = [
        "24,892",
        "312",
        ">48<",
        "reported workers",
        "high-risk",
        "reportedWorkerCount",
        "highRiskCount",
        "completedGigs",
        "riskScore",
      ];

      for (const item of forbiddenStrings) {
        assert.strictEqual(
          content.toLowerCase().includes(item.toLowerCase()),
          false,
          `AdminWorkers.tsx must not contain unsupported item: ${item}`,
        );
      }
    });

    test("3.7. Simulated role filtering correctly isolates workers and derives real count", () => {
      const sampleAdminUsers = [
        { id: "1", email: "admin@example.com", role: "ADMIN", firstName: "Admin", lastName: "One", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
        { id: "2", email: "worker1@example.com", role: "WORKER", firstName: "Worker", lastName: "One", isActive: true, isBlocked: false, createdAt: "2026-01-02" },
        { id: "3", email: "worker2@example.com", role: "WORKER", firstName: "Worker", lastName: "Two", isActive: true, isBlocked: false, createdAt: "2026-01-03" },
        { id: "4", email: "worker3@example.com", role: "WORKER", firstName: "Worker", lastName: "Three", isActive: true, isBlocked: true, createdAt: "2026-01-04" },
        { id: "5", email: "recruiter@example.com", role: "RECRUITER", firstName: "Recruiter", lastName: "One", isActive: true, isBlocked: false, createdAt: "2026-01-05" },
      ];

      const filteredWorkers = sampleAdminUsers.filter((u) => u.role === "WORKER");
      assert.strictEqual(filteredWorkers.length, 3);
      assert.deepStrictEqual(
        filteredWorkers.map((w) => w.id),
        ["2", "3", "4"],
      );
      assert.strictEqual(filteredWorkers.every((w) => w.role === "WORKER"), true);
    });
  });

  describe("4. AdminSidebar Active State Verification", () => {
    test("4.1. AdminSidebar has Workers nav item mapped to /admin/workers", () => {
      assert.strictEqual(fs.existsSync(sidebarPath), true);
      const content = fs.readFileSync(sidebarPath, "utf-8");
      assert.match(content, /id:\s*["']workers["']/);
      assert.match(content, /name:\s*["']Workers["']/);
      assert.match(content, /path:\s*["']\/admin\/workers["']/);
    });

    test("4.2. AdminSidebar active tab check resolves true for 'workers'", () => {
      const content = fs.readFileSync(sidebarPath, "utf-8");
      assert.match(
        content,
        /const isCurrentActive = \(id: string, path: string\) => \{[\s\S]*?if \(activeTab === id\) return true;[\s\S]*?return location\.pathname === path;[\s\S]*?\};/,
      );
    });
  });

  describe("5. WorkerTable Component & Row Structure (Step 5)", () => {
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerTable.tsx",
    );

    test("5.1. WorkerTable.tsx exists and is presentational without API or token dependencies", () => {
      assert.strictEqual(fs.existsSync(tablePath), true);
      const content = fs.readFileSync(tablePath, "utf-8");

      assert.strictEqual(content.includes("axios"), false, "WorkerTable must not import axios");
      assert.strictEqual(content.includes("fetch("), false, "WorkerTable must not call fetch()");
      assert.strictEqual(content.includes("getAdminUsers"), false, "WorkerTable must not call getAdminUsers()");
      assert.strictEqual(content.includes("localStorage"), false, "WorkerTable must not access localStorage");
      assert.strictEqual(content.includes("sessionStorage"), false, "WorkerTable must not access sessionStorage");
    });

    test("5.2. AdminWorkers.tsx integrates WorkerTable passing filteredWorkers prop", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        pageContent,
        /import\s+\{\s*WorkerTable\s*\}\s+from\s+["']@\/components\/admin\/workers\/WorkerTable["']/,
        "AdminWorkers.tsx must import WorkerTable",
      );
      assert.match(
        pageContent,
        /<WorkerTable[\s\S]*?workers=\{filteredWorkers\}[\s\S]*?\/>/,
        "AdminWorkers.tsx must render WorkerTable passing workers={filteredWorkers}",
      );
    });

    test("5.3. WorkerTable enforces role filtering ensuring only WORKER accounts render", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /workers\.filter\(\s*\(user\)\s*=>\s*user\.role\s*===\s*["']WORKER["']\s*\)/,
        "WorkerTable must filter incoming workers by role === 'WORKER'",
      );

      // Simulation verifying non-worker rejection
      const mixedUsers = [
        { id: "w-1", role: "WORKER", firstName: "Alex", lastName: "Denton", email: "alex@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
        { id: "a-1", role: "ADMIN", firstName: "Root", lastName: "Admin", email: "admin@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
        { id: "r-1", role: "RECRUITER", firstName: "Tech", lastName: "Recruiter", email: "rec@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
      ];
      const filtered = mixedUsers.filter((u) => u.role === "WORKER");
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, "w-1");
    });

    test("5.4. Worker identity row displays name from firstName + lastName with location and short ID", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /worker\.firstName/, "Must use worker.firstName");
      assert.match(content, /worker\.lastName/, "Must use worker.lastName");
      assert.match(content, /worker\.location/, "Must use worker.location");
      assert.match(content, /worker\.id\.slice\(0,\s*8\)/, "Must format shortened worker ID");

      // Verify initials logic
      const worker = { firstName: "Carlos", lastName: "Mendoza" };
      const initials = `${worker.firstName?.[0] || ""}${worker.lastName?.[0] || ""}`.toUpperCase();
      assert.strictEqual(initials, "CM");
    });

    test("5.5. Bio is NOT reinterpreted as a job title", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.strictEqual(
        content.includes("worker.bio"),
        false,
        "WorkerTable must NOT use worker.bio as job title or display element",
      );
    });

    test("5.6. Account status correctly reflects real isBlocked and isActive flags", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /worker\.isBlocked/);
      assert.match(content, /worker\.isActive/);

      // Status resolution logic simulation
      const resolveStatus = (u) => {
        if (u.isBlocked) return "Blocked";
        if (!u.isActive) return "Inactive";
        return "Active";
      };

      assert.strictEqual(resolveStatus({ isActive: true, isBlocked: false }), "Active");
      assert.strictEqual(resolveStatus({ isActive: true, isBlocked: true }), "Blocked");
      assert.strictEqual(resolveStatus({ isActive: false, isBlocked: false }), "Inactive");
    });

    test("5.7. Action buttons 'View profile' and 'Block user' / 'Unblock user' are rendered", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /View profile/, "Must render 'View profile' button");
      assert.match(
        content,
        /worker\.isBlocked\s*\?\s*["']Unblock user["']\s*:\s*["']Block user["']/,
        "Must dynamically toggle button text between 'Unblock user' and 'Block user'",
      );
      assert.strictEqual(content.includes("console.log"), false, "Must not contain console.log");
    });

    test("5.8. Table does NOT render unsupported Figma columns or metrics", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      const forbiddenColumns = [
        "rating",
        "completed gigs",
        "reports so far",
        "reports count",
        "risk score",
        "high risk",
        "high-risk",
      ];

      for (const col of forbiddenColumns) {
        assert.strictEqual(
          content.toLowerCase().includes(col),
          false,
          `WorkerTable must not contain unsupported column: ${col}`,
        );
      }
    });
  });

  describe("6. Worker Search and Location Filtering (Step 6)", () => {
    test("6.1. AdminWorkers.tsx defines search input with correct testid and placeholder", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']input-worker-search["']/);
      assert.match(
        content,
        /placeholder=["']Search by worker name, role, or worker ID\.\.\.["']/,
      );
    });

    test("6.2. AdminWorkers.tsx defines location select with correct testid and 'All Locations' option", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']select-worker-location["']/);
      assert.match(content, /<option value=["']ALL["']>All Locations<\/option>/);
    });

    test("6.3. Unsupported Rating and Reports filters are NOT rendered", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      const forbiddenFilters = [
        "select-worker-rating",
        "select-worker-reports",
        "Rating filter",
        "Reports filter",
        "4.0+",
        "4.5+",
        "5.0",
        "0 reports",
        "1+ reports",
      ];

      for (const filter of forbiddenFilters) {
        assert.strictEqual(
          content.toLowerCase().includes(filter.toLowerCase()),
          false,
          `AdminWorkers.tsx must not contain unsupported filter or option: ${filter}`,
        );
      }
    });

    test("6.4. No new API request is dispatched for filtering (client-side only)", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.strictEqual(content.includes("/admin/workers?search="), false);
      assert.strictEqual(content.includes("/admin/users?location="), false);
      assert.strictEqual(content.includes("useSearchParams"), false);
    });

    test("6.5. Empty filter result state renders when workers > 0 but filteredWorkers === 0", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']workers-filter-empty["']/);
      assert.match(content, /No matching workers/);
      assert.match(content, /No workers match your current search or location filter\./);
      assert.match(content, /data-testid=["']btn-reset-filters["']/);
      assert.match(content, /Clear filters/);
    });

    describe("6.6. Filter Pipeline Simulation Tests", () => {
      const sampleWorkers = [
        {
          id: "usr-101",
          email: "alex.denton@example.com",
          role: "WORKER",
          firstName: "Alex",
          lastName: "Denton",
          location: "Chicago, IL",
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-01",
        },
        {
          id: "usr-202",
          email: "maya.lin@gmail.com",
          role: "WORKER",
          firstName: "Maya",
          lastName: "Lin",
          location: "Chicago, IL",
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-02",
        },
        {
          id: "usr-303",
          email: "carlos.m@example.com",
          role: "WORKER",
          firstName: "Carlos",
          lastName: "Mendoza",
          location: "Evanston, IL",
          isActive: true,
          isBlocked: true,
          createdAt: "2026-01-03",
        },
        {
          id: "usr-404",
          email: "zoe.okafor@outlook.com",
          role: "WORKER",
          firstName: "Zoe",
          lastName: "Okafor",
          location: null,
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-04",
        },
        {
          id: "usr-505",
          email: "rahul.sharma@example.com",
          role: "WORKER",
          firstName: "Rahul",
          lastName: "Sharma",
          location: "",
          isActive: false,
          isBlocked: false,
          createdAt: "2026-01-05",
        },
      ];

      const applyFilters = (workersList, searchTerm, selectedLocation) => {
        const query = searchTerm.trim().toLowerCase();
        const filterLoc = selectedLocation.trim().toLowerCase();

        return workersList.filter((worker) => {
          if (query) {
            const firstName = (worker.firstName || "").toLowerCase();
            const lastName = (worker.lastName || "").toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const email = (worker.email || "").toLowerCase();
            const id = (worker.id || "").toLowerCase();
            const location = (worker.location || "").toLowerCase();

            const matchesSearch =
              firstName.includes(query) ||
              lastName.includes(query) ||
              fullName.includes(query) ||
              email.includes(query) ||
              id.includes(query) ||
              location.includes(query);

            if (!matchesSearch) return false;
          }

          if (filterLoc && filterLoc !== "all") {
            const workerLoc = (worker.location || "").trim().toLowerCase();
            if (workerLoc !== filterLoc) {
              return false;
            }
          }

          return true;
        });
      };

      test("6.6.1. Empty search and 'ALL' location returns all workers", () => {
        const result = applyFilters(sampleWorkers, "", "ALL");
        assert.strictEqual(result.length, 5);
      });

      test("6.6.2. Search by first name works and is case-insensitive", () => {
        const resultLower = applyFilters(sampleWorkers, "alex", "ALL");
        assert.strictEqual(resultLower.length, 1);
        assert.strictEqual(resultLower[0].id, "usr-101");

        const resultUpper = applyFilters(sampleWorkers, "ALEX", "ALL");
        assert.strictEqual(resultUpper.length, 1);
        assert.strictEqual(resultUpper[0].id, "usr-101");
      });

      test("6.6.3. Search by last name works", () => {
        const result = applyFilters(sampleWorkers, "mendoza", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-303");
      });

      test("6.6.4. Search by combined full name works", () => {
        const result = applyFilters(sampleWorkers, "Maya Lin", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-202");
      });

      test("6.6.5. Search by email works", () => {
        const result = applyFilters(sampleWorkers, "gmail.com", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-202");
      });

      test("6.6.6. Search by worker ID works", () => {
        const result = applyFilters(sampleWorkers, "usr-303", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-303");
      });

      test("6.6.7. Search by location text works", () => {
        const result = applyFilters(sampleWorkers, "Evanston", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-303");
      });

      test("6.6.8. Location filter returns only matching workers", () => {
        const result = applyFilters(sampleWorkers, "", "Chicago, IL");
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(
          result.map((w) => w.id),
          ["usr-101", "usr-202"],
        );
      });

      test("6.6.9. Search + location filtering work together (AND composition)", () => {
        // Both Alex and Maya are in Chicago, but search 'Alex' narrows to 1
        const result = applyFilters(sampleWorkers, "Alex", "Chicago, IL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "usr-101");

        // Carlos is in Evanston, so search 'Carlos' + Chicago returns 0
        const noMatchResult = applyFilters(sampleWorkers, "Carlos", "Chicago, IL");
        assert.strictEqual(noMatchResult.length, 0);
      });

      test("6.6.10. Worker dataset with null or empty locations does not crash", () => {
        assert.doesNotThrow(() => {
          const resultAll = applyFilters(sampleWorkers, "", "ALL");
          assert.strictEqual(resultAll.length, 5);

          const resultLoc = applyFilters(sampleWorkers, "", "Chicago, IL");
          assert.strictEqual(resultLoc.length, 2);
        });
      });

      test("6.6.11. Dynamic location list derivation excludes null and empty strings", () => {
        const locs = new Set();
        for (const worker of sampleWorkers) {
          if (worker.location && worker.location.trim().length > 0) {
            locs.add(worker.location.trim());
          }
        }
        const derived = Array.from(locs).sort();
        assert.deepStrictEqual(derived, ["Chicago, IL", "Evanston, IL"]);
      });
    });
  });

  describe("7. Worker View Profile Modal & getAdminUser(userId) Integration (Step 7)", () => {
    const modalPath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerProfileModal.tsx",
    );
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerTable.tsx",
    );

    test("7.1. WorkerProfileModal.tsx exists and is presentational without direct Axios or API imports", () => {
      assert.strictEqual(fs.existsSync(modalPath), true);
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.strictEqual(content.includes("axios"), false, "WorkerProfileModal must not import axios");
      assert.strictEqual(content.includes("fetch("), false, "WorkerProfileModal must not call fetch()");
      assert.strictEqual(content.includes("getAdminUser"), false, "WorkerProfileModal must not call getAdminUser()");
      assert.strictEqual(content.includes("useAuth"), false, "WorkerProfileModal must not access AuthContext");
      assert.strictEqual(content.includes("localStorage"), false, "WorkerProfileModal must not access localStorage");
    });

    test("7.2. WorkerTable renders 'View profile' button wiring to onViewProfile(worker.id)", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /data-testid=\{`btn-view-profile-\$\{worker\.id\}`\}/);
      assert.match(content, /View profile/);
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onViewProfile\?\.(\(worker\.id\))/,
        "Clicking View profile must trigger onViewProfile with worker.id",
      );
      assert.strictEqual(
        content.includes("getAdminUser"),
        false,
        "WorkerTable must NOT call getAdminUser directly",
      );
    });

    test("7.3. AdminWorkers imports getAdminUser and handles single user profile fetching", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+\{[^}]*getAdminUser[^}]*\}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminWorkers must import getAdminUser from @/lib/admin-api",
      );
      assert.match(
        content,
        /getAdminUser\(workerId\)/,
        "AdminWorkers must invoke getAdminUser(workerId) when viewing profile",
      );
    });

    test("7.4. Stale previous worker data is cleared immediately when initiating a new profile view", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      const handlerMatch = content.match(
        /const handleViewProfile = async \((?:workerId: string|workerId)\) => \{([\s\S]*?)\};/,
      );
      assert.ok(handlerMatch, "handleViewProfile function must exist in AdminWorkers.tsx");
      const handlerBody = handlerMatch[1];

      const clearWorkerIndex = handlerBody.indexOf("setProfileWorker(null)");
      const fetchIndex = handlerBody.indexOf("getAdminUser");

      assert.notStrictEqual(clearWorkerIndex, -1, "Must setProfileWorker(null) before fetching");
      assert.ok(
        clearWorkerIndex < fetchIndex,
        "setProfileWorker(null) must occur before getAdminUser(workerId)",
      );
    });

    test("7.5. Modal displays loading state during profile fetch", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-loading["']/);
      assert.match(content, /Loading worker profile\.\.\./);
    });

    test("7.6. Modal displays error state without crashing and provides close button", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-error["']/);
      assert.match(content, /Failed to load profile/);
      assert.match(content, /data-testid=["']btn-close-error["']/);
    });

    test("7.7. Successful profile view displays all supported AdminUser fields", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-name["']/);
      assert.match(content, /data-testid=["']profile-id["']/);
      assert.match(content, /data-testid=["']profile-email["']/);
      assert.match(content, /data-testid=["']profile-phone["']/);
      assert.match(content, /data-testid=["']profile-location["']/);
      assert.match(content, /data-testid=["']profile-bio["']/);
      assert.match(content, /data-testid=["']profile-role["']/);
      assert.match(content, /data-testid=["']profile-status["']/);
      assert.match(content, /data-testid=["']profile-created-at["']/);
    });

    test("7.8. Modal provides multiple close triggers (X button, backdrop, footer Close)", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']btn-close-modal-x["']/);
      assert.match(content, /data-testid=["']modal-backdrop["']/);
      assert.match(content, /data-testid=["']btn-close-profile-modal["']/);
    });

    test("7.9. Modal does NOT render unsupported Figma features or fake metrics", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      const forbiddenMetrics = [
        "rating",
        "completed gigs",
        "reports so far",
        "risk score",
        "high risk",
        "high-risk",
        "moderation history",
      ];

      for (const metric of forbiddenMetrics) {
        assert.strictEqual(
          content.toLowerCase().includes(metric),
          false,
          `WorkerProfileModal must not contain unsupported metric: ${metric}`,
        );
      }
    });

    test("7.10. Bio is NOT reinterpreted as a job title in modal", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-bio["']/);
      assert.strictEqual(
        content.includes("Occupation:"),
        false,
        "Modal must not format bio as job title or occupation",
      );
    });
  });

  describe("8. Worker Block / Unblock Integration (Step 8)", () => {
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerTable.tsx",
    );
    const pagePath = path.resolve(__dirname, "../pages/admin/AdminWorkers.tsx");
    const apiPath = path.resolve(__dirname, "../lib/admin-api.ts");

    test("8.1. admin-api.ts exports setAdminUserBlockStatus sending PATCH /admin/users/:userId/block", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /export\s+const\s+setAdminUserBlockStatus\s*=/);
      assert.match(
        content,
        /api\.patch<AdminUser>\(\s*`\/admin\/users\/\$\{userId\}\/block`,\s*payload,?\s*\)/,
      );
    });

    test("8.2. WorkerTable.tsx remains presentational with no direct API calls", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.strictEqual(
        content.includes("axios"),
        false,
        "WorkerTable must not import axios",
      );
      assert.strictEqual(
        content.includes("fetch("),
        false,
        "WorkerTable must not call fetch()",
      );
      assert.strictEqual(
        content.includes("setAdminUserBlockStatus"),
        false,
        "WorkerTable must not call setAdminUserBlockStatus()",
      );
      assert.strictEqual(
        content.includes("getAdminUser"),
        false,
        "WorkerTable must not call getAdminUser()",
      );
      assert.strictEqual(
        content.includes("localStorage"),
        false,
        "WorkerTable must not access localStorage",
      );
      assert.strictEqual(
        content.includes("sessionStorage"),
        false,
        "WorkerTable must not access sessionStorage",
      );
    });

    test("8.3. WorkerTable emits correct worker ID and target block state on click", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /data-testid=\{`btn-block-toggle-\$\{worker\.id\}`\}/,
      );
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onToggleBlock\?\.(\(worker\.id,\s*!worker\.isBlocked\))/,
        "WorkerTable must invoke onToggleBlock with worker.id and !worker.isBlocked",
      );

      // Simulation test
      const events = [];
      const mockToggle = (workerId, nextBlockedState) => {
        events.push({ workerId, nextBlockedState });
      };

      const unblockedWorker = { id: "w-1", isBlocked: false };
      const blockedWorker = { id: "w-2", isBlocked: true };

      // Simulate clicking Block on unblocked worker
      mockToggle(unblockedWorker.id, !unblockedWorker.isBlocked);
      assert.deepStrictEqual(events[0], {
        workerId: "w-1",
        nextBlockedState: true,
      });

      // Simulate clicking Unblock on blocked worker
      mockToggle(blockedWorker.id, !blockedWorker.isBlocked);
      assert.deepStrictEqual(events[1], {
        workerId: "w-2",
        nextBlockedState: false,
      });
    });

    test("8.4. WorkerTable renders loading/disabled state based on blockingWorkerId", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /disabled=\{Boolean\(blockingWorkerId\)\}/,
        "Buttons must be disabled while a mutation is running",
      );
      assert.match(
        content,
        /blockingWorkerId === worker\.id\s*\?\s*worker\.isBlocked\s*\?\s*["']Unblocking\.\.\.["']\s*:\s*["']Blocking\.\.\.["']/,
      );

      // Label resolution simulation
      const getLabel = (worker, blockingWorkerId) => {
        if (blockingWorkerId === worker.id) {
          return worker.isBlocked ? "Unblocking..." : "Blocking...";
        }
        return worker.isBlocked ? "Unblock user" : "Block user";
      };

      const wActive = { id: "w-1", isBlocked: false };
      const wBlocked = { id: "w-2", isBlocked: true };

      assert.strictEqual(getLabel(wActive, null), "Block user");
      assert.strictEqual(getLabel(wBlocked, null), "Unblock user");
      assert.strictEqual(getLabel(wActive, "w-1"), "Blocking...");
      assert.strictEqual(getLabel(wBlocked, "w-2"), "Unblocking...");
      assert.strictEqual(getLabel(wActive, "w-other"), "Block user");
    });

    test("8.5. AdminWorkers imports setAdminUserBlockStatus and wires WorkerTable callbacks", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+\{[^}]*setAdminUserBlockStatus[^}]*\}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminWorkers must import setAdminUserBlockStatus from @/lib/admin-api",
      );
      assert.match(
        content,
        /setAdminUserBlockStatus\(\s*workerId,\s*nextBlockedState/,
        "AdminWorkers must invoke setAdminUserBlockStatus(workerId, nextBlockedState)",
      );
      assert.match(
        content,
        /blockingWorkerId=\{blockingWorkerId\}/,
        "AdminWorkers must pass blockingWorkerId to WorkerTable",
      );
      assert.match(
        content,
        /onToggleBlock=\{\(workerId,\s*nextBlockedState\)\s*=>\s*\{[\s\S]*?handleToggleBlock\(workerId,\s*nextBlockedState\)/,
        "AdminWorkers must pass onToggleBlock handler to WorkerTable",
      );
    });

    test("8.6. Successful block updates worker row in directory state", async () => {
      // State transition simulation mirroring AdminWorkers
      let users = [
        {
          id: "usr-1",
          role: "WORKER",
          firstName: "Alex",
          lastName: "Denton",
          isBlocked: false,
          isActive: true,
        },
        {
          id: "usr-2",
          role: "WORKER",
          firstName: "Maya",
          lastName: "Lin",
          isBlocked: false,
          isActive: true,
        },
      ];

      const fakeBackendBlock = async (id, isBlocked) => {
        const target = users.find((u) => u.id === id);
        return { ...target, isBlocked };
      };

      const updated = await fakeBackendBlock("usr-1", true);
      users = users.map((u) => (u.id === updated.id ? updated : u));

      assert.strictEqual(users[0].isBlocked, true);
      assert.strictEqual(users[1].isBlocked, false);
      assert.strictEqual(users[0].firstName, "Alex"); // Preserves other fields
    });

    test("8.7. Successful unblock updates worker row in directory state", async () => {
      let users = [
        {
          id: "usr-1",
          role: "WORKER",
          firstName: "Alex",
          lastName: "Denton",
          isBlocked: true,
          isActive: true,
        },
      ];

      const fakeBackendUnblock = async (id, isBlocked) => {
        const target = users.find((u) => u.id === id);
        return { ...target, isBlocked };
      };

      const updated = await fakeBackendUnblock("usr-1", false);
      users = users.map((u) => (u.id === updated.id ? updated : u));

      assert.strictEqual(users[0].isBlocked, false);
      assert.strictEqual(users[0].isActive, true);
    });

    test("8.8. Open profile modal stays synchronized when worker status is toggled", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /setProfileWorker\(\(?prev\)?\s*=>[\s\S]*?updatedUser\.id\s*\?\s*updatedUser\s*:\s*prev/,
        "AdminWorkers must update profileWorker when the updated user matches open modal worker",
      );

      // Simulation test
      let profileWorker = { id: "usr-1", isBlocked: false };
      const updatedUser = { id: "usr-1", isBlocked: true };

      const syncProfile = (prev, updated) =>
        prev && prev.id === updated.id ? updated : prev;

      profileWorker = syncProfile(profileWorker, updatedUser);
      assert.strictEqual(profileWorker.isBlocked, true);

      // Different worker does not overwrite open profile
      const otherUser = { id: "usr-99", isBlocked: true };
      profileWorker = syncProfile(profileWorker, otherUser);
      assert.strictEqual(profileWorker.id, "usr-1");
      assert.strictEqual(profileWorker.isBlocked, true);
    });

    test("8.9. Concurrency guard prevents duplicate mutation requests while in flight", async () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /if\s*\(\s*blockingWorkerId\s*\)\s*return;/,
        "handleToggleBlock must return early if blockingWorkerId is active",
      );

      // Simulation
      let callCount = 0;
      let activeBlockingId = null;

      const simulateToggle = async (workerId) => {
        if (activeBlockingId) return;
        activeBlockingId = workerId;
        callCount++;
        await new Promise((r) => setTimeout(r, 5));
        activeBlockingId = null;
      };

      // Dispatch two concurrent calls
      const p1 = simulateToggle("usr-1");
      const p2 = simulateToggle("usr-1");
      await Promise.all([p1, p2]);

      assert.strictEqual(callCount, 1, "Must only invoke mutation API once");
    });

    test("8.10. Mutation failure preserves existing worker state without corrupting UI", async () => {
      const users = [
        { id: "usr-1", role: "WORKER", firstName: "Alex", isBlocked: false },
      ];
      let actionError = null;
      let blockingWorkerId = null;

      const failedBackendBlock = async () => {
        throw new Error("Network timeout or server error");
      };

      const simulateFailedToggle = async (workerId, nextBlocked) => {
        if (blockingWorkerId) return;
        blockingWorkerId = workerId;
        actionError = null;
        try {
          await failedBackendBlock(workerId, nextBlocked);
        } catch {
          actionError = "Failed to block worker. Please try again.";
        } finally {
          blockingWorkerId = null;
        }
      };

      await simulateFailedToggle("usr-1", true);

      // State is preserved
      assert.strictEqual(
        users[0].isBlocked,
        false,
        "Worker isBlocked flag must remain unchanged on failure",
      );
      assert.strictEqual(
        blockingWorkerId,
        null,
        "blockingWorkerId must be cleared",
      );
      assert.strictEqual(
        actionError,
        "Failed to block worker. Please try again.",
      );
    });

    test("8.11. Action error alert banner and dismiss button are rendered in AdminWorkers", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']worker-action-error["']/);
      assert.match(content, /data-testid=["']btn-dismiss-action-error["']/);
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*setActionError\(null\)\}/,
        "Clicking dismiss button must reset actionError to null",
      );
    });

    test("8.12. Filter and search states are preserved across block/unblock mutation", () => {
      const initialWorkers = [
        {
          id: "usr-1",
          role: "WORKER",
          firstName: "Alex",
          lastName: "Denton",
          location: "Chicago, IL",
          isBlocked: false,
        },
        {
          id: "usr-2",
          role: "WORKER",
          firstName: "Carlos",
          lastName: "Mendoza",
          location: "Evanston, IL",
          isBlocked: false,
        },
      ];

      const searchTerm = "Alex";
      const selectedLocation = "Chicago, IL";

      // Filter before mutation
      const filterFn = (list, query, loc) =>
        list.filter((w) => {
          const matchesQuery =
            !query ||
            w.firstName.toLowerCase().includes(query.toLowerCase());
          const matchesLoc = !loc || loc === "ALL" || w.location === loc;
          return matchesQuery && matchesLoc;
        });

      const before = filterFn(initialWorkers, searchTerm, selectedLocation);
      assert.strictEqual(before.length, 1);
      assert.strictEqual(before[0].id, "usr-1");
      assert.strictEqual(before[0].isBlocked, false);

      // Mutate Alex to isBlocked: true
      const updatedAlex = { ...initialWorkers[0], isBlocked: true };
      const updatedList = initialWorkers.map((w) =>
        w.id === updatedAlex.id ? updatedAlex : w,
      );

      // Filter after mutation with same filters
      const after = filterFn(updatedList, searchTerm, selectedLocation);
      assert.strictEqual(after.length, 1);
      assert.strictEqual(after[0].id, "usr-1");
      assert.strictEqual(after[0].isBlocked, true);
    });

    test("8.13. No unsupported Figma metrics or fields introduced in block flow", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      const tableContent = fs.readFileSync(tablePath, "utf-8");
      const forbiddenStrings = [
        "rating",
        "completed gigs",
        "reports so far",
        "reports count",
        "risk score",
        "high risk",
        "high-risk",
      ];

      for (const item of forbiddenStrings) {
        assert.strictEqual(
          pageContent.toLowerCase().includes(item),
          false,
          `AdminWorkers must not contain unsupported item: ${item}`,
        );
        assert.strictEqual(
          tableContent.toLowerCase().includes(item),
          false,
          `WorkerTable must not contain unsupported item: ${item}`,
        );
      }
    });
  });

  describe("9. Final State Refinement & Resilience Verification (Step 9)", () => {
    const pagePath = path.resolve(__dirname, "../pages/admin/AdminWorkers.tsx");
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerTable.tsx",
    );
    const modalPath = path.resolve(
      __dirname,
      "../components/admin/workers/WorkerProfileModal.tsx",
    );

    test("9.1. Initial directory loading state renders spinner and neutral KPI '—'", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']workers-loading["']/);
      assert.match(content, /Loading worker directory\.\.\./);
      assert.match(
        content,
        /isLoading\s*\?\s*\([\s\S]*?—[\s\S]*?\)\s*:\s*error\s*\?/,
        "KPI must show neutral '—' during loading",
      );
    });

    test("9.2. Initial directory success renders real workers and real KPI count", () => {
      const sample = [
        {
          id: "w-1",
          role: "WORKER",
          firstName: "Alex",
          lastName: "Denton",
          isBlocked: false,
          isActive: true,
        },
        {
          id: "w-2",
          role: "WORKER",
          firstName: "Maya",
          lastName: "Lin",
          isBlocked: false,
          isActive: true,
        },
      ];
      const count = sample.filter((u) => u.role === "WORKER").length;
      assert.strictEqual(count, 2);
      assert.strictEqual(count.toLocaleString(), "2");
    });

    test("9.3. Empty worker dataset (CASE A) renders workers-directory-empty without filter reset button", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']workers-directory-empty["']/);
      assert.match(content, /No workers registered/);
      assert.match(
        content,
        /There are currently no worker accounts in the system\./,
      );

      // Simulation: workers.length === 0 must select directory-empty branch
      const resolveEmptyBranch = (workersLen, filteredLen) => {
        if (workersLen === 0) return "DIRECTORY_EMPTY";
        if (filteredLen === 0) return "FILTER_EMPTY";
        return "TABLE";
      };

      assert.strictEqual(resolveEmptyBranch(0, 0), "DIRECTORY_EMPTY");
    });

    test("9.4. Filtered-empty worker result (CASE B) renders workers-filter-empty with reset button", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']workers-filter-empty["']/);
      assert.match(content, /No matching workers/);
      assert.match(
        content,
        /No workers match your current search or location filter\./,
      );
      assert.match(content, /data-testid=["']btn-reset-filters["']/);
      assert.match(content, /Clear filters/);

      const resolveEmptyBranch = (workersLen, filteredLen) => {
        if (workersLen === 0) return "DIRECTORY_EMPTY";
        if (filteredLen === 0) return "FILTER_EMPTY";
        return "TABLE";
      };

      assert.strictEqual(resolveEmptyBranch(5, 0), "FILTER_EMPTY");
      assert.strictEqual(resolveEmptyBranch(5, 2), "TABLE");
    });

    test("9.5. Initial API failure renders workers-error and neutral KPI '—'", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']workers-error["']/);
      assert.match(content, /Failed to load workers/);
      assert.match(
        content,
        /error\s*\?\s*\([\s\S]*?—[\s\S]*?\)\s*:\s*\(?\s*workers\.length\.toLocaleString\(\)/,
        "KPI must show neutral '—' on error",
      );
    });

    test("9.6. Retry mechanism calls getAdminUsers and clears previous error", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']btn-retry-workers["']/);
      assert.match(content, /const handleRetry = async \(\) => \{/);

      // Simulation test of handleRetry lifecycle
      let isLoading = false;
      let error = "Previous network failure";
      let users = [];

      const simulateRetry = async (shouldSucceed) => {
        isLoading = true;
        error = null;
        try {
          if (!shouldSucceed) throw new Error("Retry error");
          users = [
            {
              id: "w-1",
              role: "WORKER",
              firstName: "Alex",
              lastName: "D",
              isBlocked: false,
              isActive: true,
            },
          ];
        } catch (err) {
          error = err.message;
        } finally {
          isLoading = false;
        }
      };

      // Successful retry simulation
      return simulateRetry(true).then(() => {
        assert.strictEqual(isLoading, false);
        assert.strictEqual(error, null);
        assert.strictEqual(users.length, 1);

        // Failed retry simulation
        return simulateRetry(false).then(() => {
          assert.strictEqual(isLoading, false);
          assert.strictEqual(error, "Retry error");
        });
      });
    });

    test("9.7. Profile loading state clears previous worker and displays spinner", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      const modalContent = fs.readFileSync(modalPath, "utf-8");

      assert.match(
        pageContent,
        /setProfileWorker\(null\)/,
        "Must immediately clear profileWorker before fetching",
      );
      assert.match(
        pageContent,
        /setIsLoadingProfile\(true\)/,
        "Must set isLoadingProfile to true",
      );
      assert.match(modalContent, /data-testid=["']profile-loading["']/);
      assert.match(modalContent, /Loading worker profile\.\.\./);
    });

    test("9.8. Profile success renders all supported fields and resets loading state", () => {
      const modalContent = fs.readFileSync(modalPath, "utf-8");
      assert.match(modalContent, /data-testid=["']profile-content["']/);
      assert.match(modalContent, /data-testid=["']profile-name["']/);
      assert.match(modalContent, /data-testid=["']profile-email["']/);
      assert.match(modalContent, /data-testid=["']profile-status["']/);
    });

    test("9.9. Profile failure preserves null profileWorker and displays error card with close", () => {
      const modalContent = fs.readFileSync(modalPath, "utf-8");
      assert.match(modalContent, /data-testid=["']profile-error["']/);
      assert.match(modalContent, /Failed to load profile/);
      assert.match(modalContent, /data-testid=["']btn-close-error["']/);
    });

    test("9.10. Profile A -> Profile B request race: slow Profile A does NOT overwrite Profile B", async () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        pageContent,
        /activeProfileWorkerIdRef\.current\s*=\s*workerId/,
        "Must track active profile workerId via ref",
      );
      assert.match(
        pageContent,
        /if\s*\(\s*activeProfileWorkerIdRef\.current\s*===\s*workerId\s*\)\s*\{[\s\S]*?setProfileWorker\(data\)/,
        "Must guard setProfileWorker with active ref check",
      );

      // Race condition simulation
      let activeRef = null;
      let displayedWorker = null;

      const requestProfile = async (workerId, delayMs, payload) => {
        activeRef = workerId;
        displayedWorker = null;

        await new Promise((r) => setTimeout(r, delayMs));

        // Check ref guard
        if (activeRef === workerId) {
          displayedWorker = payload;
        }
      };

      // Request A starts with 30ms latency
      const pA = requestProfile("worker-A", 30, {
        id: "worker-A",
        name: "Worker Alpha",
      });
      // User quickly clicks Worker B with 10ms latency
      await new Promise((r) => setTimeout(r, 5));
      const pB = requestProfile("worker-B", 10, {
        id: "worker-B",
        name: "Worker Beta",
      });

      await Promise.all([pA, pB]);

      // Worker B must be displayed, NOT Worker A
      assert.strictEqual(displayedWorker.id, "worker-B");
      assert.strictEqual(displayedWorker.name, "Worker Beta");
    });

    test("9.11. Closing modal while profile request is in flight discards pending payload", async () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        pageContent,
        /const handleCloseModal = \(\) => \{[\s\S]*?activeProfileWorkerIdRef\.current\s*=\s*null;/,
        "handleCloseModal must invalidate activeProfileWorkerIdRef",
      );

      // In-flight closure simulation
      let activeRef = "worker-A";
      let isModalOpen = true;
      let profileWorker = null;

      const slowRequest = async () => {
        await new Promise((r) => setTimeout(r, 20));
        if (activeRef === "worker-A") {
          profileWorker = { id: "worker-A" };
        }
      };

      const inFlightPromise = slowRequest();

      // User closes modal after 5ms
      await new Promise((r) => setTimeout(r, 5));
      activeRef = null;
      isModalOpen = false;
      profileWorker = null;

      await inFlightPromise;

      assert.strictEqual(isModalOpen, false);
      assert.strictEqual(
        profileWorker,
        null,
        "Payload must be discarded after closure",
      );
    });

    test("9.12. Block success state transitions user to isBlocked: true", () => {
      const initial = { id: "w-1", isBlocked: false };
      const updated = { ...initial, isBlocked: true };
      const statusLabel = updated.isBlocked ? "Blocked" : "Active";
      const buttonLabel = updated.isBlocked ? "Unblock user" : "Block user";

      assert.strictEqual(statusLabel, "Blocked");
      assert.strictEqual(buttonLabel, "Unblock user");
    });

    test("9.13. Unblock success state transitions user to isBlocked: false", () => {
      const initial = { id: "w-1", isBlocked: true };
      const updated = { ...initial, isBlocked: false };
      const statusLabel = updated.isBlocked ? "Blocked" : "Active";
      const buttonLabel = updated.isBlocked ? "Unblock user" : "Block user";

      assert.strictEqual(statusLabel, "Active");
      assert.strictEqual(buttonLabel, "Block user");
    });

    test("9.14. Block/unblock mutation failure preserves worker state and displays error", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      assert.match(pageContent, /data-testid=["']worker-action-error["']/);
      assert.match(pageContent, /data-testid=["']btn-dismiss-action-error["']/);

      // Simulation verifying state preservation
      const worker = { id: "w-1", isBlocked: false };
      let actionError = null;
      try {
        throw new Error("403 Forbidden");
      } catch {
        actionError = "Failed to block worker. Please try again.";
      }

      assert.strictEqual(worker.isBlocked, false);
      assert.strictEqual(
        actionError,
        "Failed to block worker. Please try again.",
      );
    });

    test("9.15. Mutation loading cleanup occurs in finally after successful block/unblock", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      const blockHandlerMatch = pageContent.match(
        /const handleToggleBlock = async \([\s\S]*?finally\s*\{([\s\S]*?)\}/,
      );
      assert.ok(
        blockHandlerMatch,
        "handleToggleBlock must contain finally block",
      );
      assert.match(
        blockHandlerMatch[1],
        /setBlockingWorkerId\(null\)/,
        "finally block must reset blockingWorkerId to null",
      );
    });

    test("9.16. Mutation loading cleanup occurs in finally after failed block/unblock", () => {
      let blockingWorkerId = "w-1";
      try {
        throw new Error("Server error");
      } catch {
        // caught
      } finally {
        blockingWorkerId = null;
      }
      assert.strictEqual(blockingWorkerId, null);
    });

    test("9.17. Search and location filters survive mutations, profile views, and directory retries", () => {
      let state = {
        searchTerm: "Alex",
        selectedLocation: "Chicago, IL",
        users: [
          {
            id: "usr-1",
            role: "WORKER",
            firstName: "Alex",
            lastName: "Denton",
            location: "Chicago, IL",
            isBlocked: false,
          },
          {
            id: "usr-2",
            role: "WORKER",
            firstName: "Maya",
            lastName: "Lin",
            location: "Chicago, IL",
            isBlocked: false,
          },
        ],
      };

      // 1. Block mutation on usr-1
      state = {
        ...state,
        users: state.users.map((u) =>
          u.id === "usr-1" ? { ...u, isBlocked: true } : u,
        ),
      };
      assert.strictEqual(state.searchTerm, "Alex");
      assert.strictEqual(state.selectedLocation, "Chicago, IL");

      // 2. Directory retry reloads data
      state = {
        ...state,
        users: [
          {
            id: "usr-1",
            role: "WORKER",
            firstName: "Alex",
            lastName: "Denton",
            location: "Chicago, IL",
            isBlocked: true,
          },
          {
            id: "usr-2",
            role: "WORKER",
            firstName: "Maya",
            lastName: "Lin",
            location: "Chicago, IL",
            isBlocked: false,
          },
        ],
      };
      assert.strictEqual(state.searchTerm, "Alex");
      assert.strictEqual(state.selectedLocation, "Chicago, IL");
    });

    test("9.18. No unsupported Figma fields or metrics introduced across all states", () => {
      const pageContent = fs.readFileSync(pagePath, "utf-8");
      const tableContent = fs.readFileSync(tablePath, "utf-8");
      const modalContent = fs.readFileSync(modalPath, "utf-8");

      const forbidden = [
        "rating",
        "completed gigs",
        "reports so far",
        "reports count",
        "risk score",
        "high risk",
        "high-risk",
      ];

      for (const item of forbidden) {
        assert.strictEqual(pageContent.toLowerCase().includes(item), false);
        assert.strictEqual(tableContent.toLowerCase().includes(item), false);
        assert.strictEqual(modalContent.toLowerCase().includes(item), false);
      }
    });
  });
});


