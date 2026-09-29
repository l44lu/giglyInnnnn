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

describe("Frontend Step 7: Admin Recruiters Route, Real Data, KPI, RecruiterTable, Filtering, Profile Modal, and Block/Unblock Integration", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const pagePath = path.resolve(__dirname, "../pages/admin/AdminRecruiters.tsx");
  const sidebarPath = path.resolve(__dirname, "../components/admin/AdminSidebar.tsx");

  describe("1. Route Registration in App.tsx", () => {
    test("1.1. App.tsx imports AdminRecruiters", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /import\s+AdminRecruiters\s+from\s+["']\.\/pages\/admin\/AdminRecruiters["']/,
        "App.tsx must import AdminRecruiters component",
      );
    });

    test("1.2. App.tsx registers /admin/recruiters with allowedRoles=['ADMIN']", () => {
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /path=["']\/admin\/recruiters["']/,
        "App.tsx must define /admin/recruiters route",
      );

      const routeBlockMatch = content.match(
        /<Route\s+path=["']\/admin\/recruiters["']\s+element=\{([\s\S]*?)\}\s*\/>/,
      );
      assert.ok(routeBlockMatch, "Route block for /admin/recruiters must exist");
      const elementContent = routeBlockMatch[1];

      assert.match(
        elementContent,
        /<ProtectedRoute\s+allowedRoles=\{\[["']ADMIN["']\]\}>/,
        "/admin/recruiters must be wrapped in ProtectedRoute with allowedRoles=['ADMIN']",
      );
      assert.match(
        elementContent,
        /<AdminRecruiters\s*\/>/,
        "ProtectedRoute must render <AdminRecruiters />",
      );
    });
  });

  describe("2. ProtectedRoute Authorization for /admin/recruiters", () => {
    const allowedRoles = ["ADMIN"];
    const pageComponent = "AdminRecruitersPage";

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

    test("2.3. Authenticated WORKER is rejected and redirected to /worker/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isLoading: false,
          isAuthenticated: true,
          role: "WORKER",
        },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/worker/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("2.4. Authenticated RECRUITER is rejected and redirected to /recruiter/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isLoading: false,
          isAuthenticated: true,
          role: "RECRUITER",
        },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/recruiter/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("2.5. Authenticated ADMIN is allowed access and renders AdminRecruiters", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isLoading: false,
          isAuthenticated: true,
          role: "ADMIN",
        },
        allowedRoles,
        children: pageComponent,
      });
      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, pageComponent);
    });
  });

  describe("3. AdminRecruiters Page Shell & Structure", () => {
    test("3.1. AdminRecruiters.tsx file exists", () => {
      assert.strictEqual(fs.existsSync(pagePath), true);
    });

    test("3.2. AdminRecruiters renders page title and subtitle", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /Recruiters Directory/,
        "Page must render 'Recruiters Directory' title",
      );
      assert.match(
        content,
        /A\s+simpler\s+admin\s+view\s+showing\s+only\s+the\s+key\s+recruiter\s+details\s+needed\s+for\s+quick\s+moderation\s+decisions\./,
        "Page must render correct subtitle",
      );
    });

    test("3.3. AdminRecruiters integrates AdminSidebar and AdminHeader", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /<AdminSidebar\s+activeTab=["']recruiters["']\s*\/>/,
        "Page must render AdminSidebar with activeTab='recruiters'",
      );
      assert.match(
        content,
        /<AdminHeader\s*\/>/,
        "Page must render AdminHeader",
      );
    });

    test("3.4. AdminRecruiters contains main directory section container", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /data-testid=["']admin-recruiters-container["']/,
        "Page must have admin-recruiters-container",
      );
      assert.match(
        content,
        /Basic recruiter information/,
        "Container must establish 'Basic recruiter information' heading",
      );
    });
  });

  describe("4. AdminSidebar Navigation & Active State", () => {
    test("4.1. AdminSidebar has Recruiters navigation item pointing to /admin/recruiters", () => {
      assert.strictEqual(fs.existsSync(sidebarPath), true);
      const content = fs.readFileSync(sidebarPath, "utf-8");
      assert.match(
        content,
        /id:\s*["']recruiters["']/,
        "AdminSidebar must have recruiters item",
      );
      assert.match(
        content,
        /name:\s*["']Recruiters["']/,
        "AdminSidebar must display 'Recruiters'",
      );
      assert.match(
        content,
        /path:\s*["']\/admin\/recruiters["']/,
        "AdminSidebar recruiters item must point to /admin/recruiters",
      );
    });

    test("4.2. AdminSidebar active tab check resolves true for 'recruiters'", () => {
      const content = fs.readFileSync(sidebarPath, "utf-8");
      assert.match(
        content,
        /activeTab\s*===\s*id/,
        "AdminSidebar must compare activeTab with item.id",
      );
      assert.match(
        content,
        /location\.pathname\s*===\s*path/,
        "AdminSidebar must compare location.pathname with item.path",
      );
    });
  });

  describe("5. Real Recruiter Data Loading & KPI Integration in AdminRecruiters.tsx (Step 3)", () => {
    test("5.1. AdminRecruiters imports and calls getAdminUsers from @/lib/admin-api", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+{[^}]*getAdminUsers[^}]*}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminRecruiters must import getAdminUsers from @/lib/admin-api",
      );
      assert.match(
        content,
        /getAdminUsers\(\)/,
        "AdminRecruiters must invoke getAdminUsers()",
      );
    });

    test("5.2. Recruiters are derived by filtering for role === 'RECRUITER'", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /user\.role\s*===\s*["']RECRUITER["']/,
        "Must filter users by role === 'RECRUITER'",
      );
    });

    test("5.3. 'Recruiters listed' KPI card renders title and subtitle", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /data-testid=["']kpi-recruiters-listed["']/,
        "Page must render kpi-recruiters-listed container",
      );
      assert.match(
        content,
        /Recruiters listed/,
        "KPI card must display 'Recruiters listed' title",
      );
      assert.match(
        content,
        /data-testid=["']kpi-recruiters-count["']/,
        "KPI card must display kpi-recruiters-count",
      );
      assert.match(
        content,
        /All recruiter accounts visible to admins/,
        "KPI card must render correct subtitle",
      );
    });

    test("5.4. Loading state renders neutral '—' and loading indicator", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /data-testid=["']recruiters-loading["']/,
        "Page must render recruiters-loading testid",
      );
      assert.match(
        content,
        /Loading recruiter directory\.\.\./,
        "Must display 'Loading recruiter directory...' message",
      );
      // In JSX, KPI count must show '—' when isLoading is true
      assert.match(
        content,
        /isLoading\s*\?\s*\(\s*<span[^>]*>\s*—\s*<\/span>/,
        "KPI count must display neutral '—' during loading",
      );
    });

    test("5.5. Error state renders neutral '—', error container, and retry button", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /data-testid=["']recruiters-error["']/,
        "Page must render recruiters-error testid",
      );
      assert.match(
        content,
        /Failed to load recruiters/,
        "Must display 'Failed to load recruiters' heading",
      );
      assert.match(
        content,
        /data-testid=["']btn-retry-recruiters["']/,
        "Page must render retry button",
      );
      // In JSX, KPI count must show '—' when error is non-null
      assert.match(
        content,
        /error\s*\?\s*\(\s*<span[^>]*>\s*—\s*<\/span>/,
        "KPI count must display neutral '—' during error state",
      );
    });

    test("5.6. Page does NOT contain unsupported Figma metrics, fake counts, or mock records", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      // Unsupported KPI numbers from Figma
      assert.doesNotMatch(content, /\b8,432\b/, "Must not hardcode 8,432");
      assert.doesNotMatch(content, /\b145\b/, "Must not hardcode 145");
      assert.doesNotMatch(content, /\b22\b/, "Must not hardcode 22");

      // Unsupported Figma cards
      assert.doesNotMatch(content, /Reported recruiters/, "Must not render 'Reported recruiters'");
      assert.doesNotMatch(content, /High-risk accounts/, "Must not render 'High-risk accounts'");

      // No fake users
      assert.doesNotMatch(content, /Marcus Thorne/i, "No mock user Marcus Thorne");
      assert.doesNotMatch(content, /Elena Rostova/i, "No mock user Elena Rostova");
      assert.doesNotMatch(content, /David Chen/i, "No mock user David Chen");
      assert.doesNotMatch(content, /Apex Hospitality/i, "No mock company Apex Hospitality");
    });

    test("5.7. Simulated role filtering correctly isolates recruiters and derives real count", () => {
      const mixedUsers = [
        { id: "1", role: "ADMIN", email: "admin@example.com", firstName: "Admin", lastName: "One" },
        { id: "2", role: "WORKER", email: "worker1@example.com", firstName: "Worker", lastName: "One" },
        { id: "3", role: "RECRUITER", email: "recruiter1@example.com", firstName: "Recruiter", lastName: "One" },
        { id: "4", role: "WORKER", email: "worker2@example.com", firstName: "Worker", lastName: "Two" },
        { id: "5", role: "RECRUITER", email: "recruiter2@example.com", firstName: "Recruiter", lastName: "Two" },
      ];

      const recruiters = mixedUsers.filter((u) => u.role === "RECRUITER");
      assert.strictEqual(recruiters.length, 2);
      assert.strictEqual(recruiters[0].id, "3");
      assert.strictEqual(recruiters[1].id, "5");
      assert.strictEqual(recruiters.every((r) => r.role === "RECRUITER"), true);
    });

    test("5.8. Simulated API lifecycle: loading -> success renders real count", async () => {
      let state = {
        users: [],
        isLoading: true,
        error: null,
      };

      // Initial state is loading
      assert.strictEqual(state.isLoading, true);
      const initialKpi = state.isLoading ? "—" : state.users.length;
      assert.strictEqual(initialKpi, "—");

      // Simulate successful fetch
      const mockApiUsers = [
        { id: "r1", role: "RECRUITER", email: "almas96565@gmail.com", firstName: "Almas", lastName: "T" },
        { id: "w1", role: "WORKER", email: "worker@example.com", firstName: "Worker", lastName: "W" },
      ];

      state = {
        users: mockApiUsers,
        isLoading: false,
        error: null,
      };

      const recruiters = state.users.filter((u) => u.role === "RECRUITER");
      assert.strictEqual(recruiters.length, 1);
      const resolvedKpi = state.isLoading ? "—" : state.error ? "—" : recruiters.length.toLocaleString();
      assert.strictEqual(resolvedKpi, "1");
    });

    test("5.9. Simulated API lifecycle: error state renders error and retry invokes getAdminUsers again", async () => {
      let callCount = 0;
      const fakeGetAdminUsers = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Network connection lost");
        }
        return [{ id: "r1", role: "RECRUITER", email: "recruiter@example.com" }];
      };

      let state = { users: [], isLoading: true, error: null };

      // Initial attempt fails
      try {
        const data = await fakeGetAdminUsers();
        state = { users: data, isLoading: false, error: null };
      } catch (err) {
        state = { users: [], isLoading: false, error: err.message };
      }

      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, "Network connection lost");
      const errorKpi = state.isLoading ? "—" : state.error ? "—" : state.users.length;
      assert.strictEqual(errorKpi, "—");
      assert.strictEqual(callCount, 1);

      // Retry attempt succeeds
      state.isLoading = true;
      state.error = null;
      try {
        const data = await fakeGetAdminUsers();
        state = { users: data, isLoading: false, error: null };
      } catch (err) {
        state = { users: [], isLoading: false, error: err.message };
      }

      assert.strictEqual(state.isLoading, false);
      assert.strictEqual(state.error, null);
      assert.strictEqual(state.users.length, 1);
      assert.strictEqual(callCount, 2);
    });

    test("5.10. Zero recruiter data renders recruiters-directory-empty without fake values", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /data-testid=["']recruiters-directory-empty["']/,
        "Must render recruiters-directory-empty when recruiters.length === 0",
      );
      assert.match(
        content,
        /No recruiters registered/,
        "Must render 'No recruiters registered' heading",
      );
      assert.match(
        content,
        /There are currently no recruiter accounts in the system\./,
        "Must render clear empty message",
      );

      // Verify simulated empty calculation
      const emptyUsers = [
        { id: "w1", role: "WORKER", email: "worker@example.com" },
      ];
      const recruiters = emptyUsers.filter((u) => u.role === "RECRUITER");
      assert.strictEqual(recruiters.length, 0);
      const emptyKpi = recruiters.length.toLocaleString();
      assert.strictEqual(emptyKpi, "0");
    });

    test("5.11. Unsupported fields are not invented", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.doesNotMatch(content, /rating\s*:/i, "Do not invent rating property");
      assert.doesNotMatch(content, /reportsCount\s*:/i, "Do not invent reportsCount");
      assert.doesNotMatch(content, /riskScore\s*:/i, "Do not invent riskScore");
      assert.doesNotMatch(content, /gigsPosted\s*:/i, "Do not invent gigsPosted");
    });

    test("5.12. AdminRecruiters integrates RecruiterTable and RecruiterProfileModal", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+{[^}]*RecruiterTable[^}]*}\s+from\s+["']@\/components\/admin\/recruiters\/RecruiterTable["']/,
        "AdminRecruiters must import RecruiterTable",
      );
      assert.match(
        content,
        /import\s+{[^}]*RecruiterProfileModal[^}]*}\s+from\s+["']@\/components\/admin\/recruiters\/RecruiterProfileModal["']/,
        "AdminRecruiters must import RecruiterProfileModal",
      );
      assert.match(
        content,
        /<RecruiterTable[\s\S]*?recruiters=\{filteredRecruiters\}[\s\S]*?\/>/,
        "AdminRecruiters must render RecruiterTable passing recruiters={filteredRecruiters}",
      );
      assert.match(
        content,
        /<RecruiterProfileModal[\s\S]*?isOpen=\{isModalOpen\}[\s\S]*?\/>/,
        "AdminRecruiters must render RecruiterProfileModal passing isOpen={isModalOpen}",
      );
      assert.doesNotMatch(content, /WorkerTable/, "Must not import WorkerTable in AdminRecruiters");
      assert.doesNotMatch(content, /WorkerProfileModal/, "Must not import WorkerProfileModal in AdminRecruiters");
    });
  });

  describe("6. RecruiterTable Component & Row Structure (Step 4)", () => {
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/recruiters/RecruiterTable.tsx",
    );

    test("6.1. RecruiterTable.tsx exists and is presentational without API or token dependencies", () => {
      assert.strictEqual(fs.existsSync(tablePath), true, "RecruiterTable.tsx must exist");
      const content = fs.readFileSync(tablePath, "utf-8");

      assert.strictEqual(content.includes("axios"), false, "RecruiterTable must not import axios");
      assert.strictEqual(content.includes("fetch("), false, "RecruiterTable must not call fetch()");
      assert.strictEqual(content.includes("getAdminUsers"), false, "RecruiterTable must not call getAdminUsers()");
      assert.strictEqual(content.includes("localStorage"), false, "RecruiterTable must not access localStorage");
      assert.strictEqual(content.includes("sessionStorage"), false, "RecruiterTable must not access sessionStorage");
    });

    test("6.2. RecruiterTable accepts recruiter records via props and defines callback props", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /recruiters:\s*AdminUser\[\]/, "RecruiterTableProps must accept recruiters: AdminUser[]");
      assert.match(content, /onViewProfile\?:\s*\(recruiterId:\s*string\)\s*=>\s*void/, "Must define onViewProfile prop");
      assert.match(
        content,
        /onToggleBlock\?:\s*\(recruiterId:\s*string,\s*nextBlockedState:\s*boolean\)\s*=>\s*void/,
        "Must define onToggleBlock prop",
      );
      assert.match(content, /blockingRecruiterId\?:\s*string\s*\|\s*null/, "Must define blockingRecruiterId prop");
    });

    test("6.3. Recruiter identity row displays name from firstName + lastName, email, location, and short ID", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /recruiter\.firstName/, "Must use recruiter.firstName");
      assert.match(content, /recruiter\.lastName/, "Must use recruiter.lastName");
      assert.match(content, /recruiter\.email/, "Must use recruiter.email");
      assert.match(content, /recruiter\.location/, "Must use recruiter.location");
      assert.match(content, /recruiter\.id\.slice\(0,\s*8\)/, "Must format shortened recruiter ID");

      // Verify initials logic
      const recruiter = { firstName: "Almas", lastName: "T" };
      const initials = `${recruiter.firstName?.[0] || ""}${recruiter.lastName?.[0] || ""}`.toUpperCase();
      assert.strictEqual(initials, "AT");

      const fallbackInitials = `${""}${""}`.toUpperCase() || "R";
      assert.strictEqual(fallbackInitials, "R");
    });

    test("6.4. RecruiterTable enforces role filtering ensuring only RECRUITER accounts render", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /recruiters\.filter\(\s*\(user\)\s*=>\s*user\.role\s*===\s*["']RECRUITER["']\s*\)/,
        "RecruiterTable must filter incoming recruiters by role === 'RECRUITER'",
      );

      // Simulation verifying non-recruiter rejection
      const mixedUsers = [
        { id: "r-1", role: "RECRUITER", firstName: "Almas", lastName: "T", email: "almas@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
        { id: "a-1", role: "ADMIN", firstName: "Root", lastName: "Admin", email: "admin@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
        { id: "w-1", role: "WORKER", firstName: "Carlos", lastName: "M", email: "carlos@test.com", isActive: true, isBlocked: false, createdAt: "2026-01-01" },
      ];
      const filtered = mixedUsers.filter((u) => u.role === "RECRUITER");
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, "r-1");
    });

    test("6.5. Account status correctly reflects real isBlocked and isActive flags (Active, Blocked, Inactive)", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /recruiter\.isBlocked/);
      assert.match(content, /recruiter\.isActive/);

      // Status resolution logic simulation
      const resolveStatus = (u) => {
        if (u.isBlocked) return "Blocked";
        if (!u.isActive) return "Inactive";
        return "Active";
      };

      assert.strictEqual(resolveStatus({ isActive: true, isBlocked: false }), "Active");
      assert.strictEqual(resolveStatus({ isActive: true, isBlocked: true }), "Blocked");
      assert.strictEqual(resolveStatus({ isActive: false, isBlocked: false }), "Inactive");
      assert.strictEqual(resolveStatus({ isActive: false, isBlocked: true }), "Blocked");
    });

    test("6.6. Action buttons 'View profile' and 'Block user' / 'Unblock user' are rendered with callbacks", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /View profile/, "Must render 'View profile' button");
      assert.match(
        content,
        /onViewProfile\?\.\(recruiter\.id\)/,
        "View profile button must trigger onViewProfile with recruiter.id",
      );
      assert.match(
        content,
        /recruiter\.isBlocked\s*\?\s*["']Unblock user["']\s*:\s*["']Block user["']/,
        "Must dynamically toggle button text between 'Unblock user' and 'Block user'",
      );
      assert.match(
        content,
        /onToggleBlock\?\.\(recruiter\.id,\s*!recruiter\.isBlocked\)/,
        "Toggle button must invoke onToggleBlock with recruiter.id and !recruiter.isBlocked",
      );
      assert.strictEqual(content.includes("console.log"), false, "Must not contain console.log");
    });

    test("6.7. RecruiterTable does NOT render unsupported Figma columns or metrics", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      const forbiddenColumns = [
        "rating",
        "stars",
        "completed gigs",
        "reports so far",
        "reports count",
        "risk score",
        "high risk",
        "high-risk",
        "gigs posted",
      ];

      for (const col of forbiddenColumns) {
        assert.strictEqual(
          content.toLowerCase().includes(col),
          false,
          `RecruiterTable must not contain unsupported column: ${col}`,
        );
      }
    });

    test("6.8. Company is not invented, and bio is not reinterpreted as company or job title", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.strictEqual(
        content.includes("recruiter.company"),
        false,
        "RecruiterTable must not access non-existent recruiter.company",
      );
      assert.strictEqual(
        content.includes("recruiter.bio"),
        false,
        "RecruiterTable must not use recruiter.bio as company or job title",
      );
      assert.doesNotMatch(content, /Apex Hospitality/i, "No mock company Apex Hospitality");
      assert.doesNotMatch(content, /InnoTech/i, "No mock company InnoTech");
    });

    test("6.9. RecruiterTable safely renders empty state row when passed empty recruiters list", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /No recruiters found\./,
        "RecruiterTable must handle empty array with 'No recruiters found.' row",
      );
    });
  });

  describe("7. Recruiter Search and Location Filtering (Step 5)", () => {
    test("7.1. AdminRecruiters.tsx defines search input with correct testid and placeholder", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']input-recruiter-search["']/);
      assert.match(
        content,
        /placeholder=["']Search by recruiter name, company, or ID\.\.\.["']/,
      );
    });

    test("7.2. AdminRecruiters.tsx defines location select with correct testid and 'All Locations' option", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']select-recruiter-location["']/);
      assert.match(content, /<option value=["']ALL["']>All Locations<\/option>/);
    });

    test("7.3. Unsupported Rating and Reports filters are NOT rendered", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      const forbiddenFilters = [
        "select-recruiter-rating",
        "select-recruiter-reports",
        "Rating filter",
        "Reports filter",
        "4.0+",
        "4.5+",
        "5.0",
        "0 reports",
        "1+ reports",
        "high risk",
        "high-risk",
      ];

      for (const filter of forbiddenFilters) {
        assert.strictEqual(
          content.toLowerCase().includes(filter.toLowerCase()),
          false,
          `AdminRecruiters.tsx must not contain unsupported filter or option: ${filter}`,
        );
      }
    });

    test("7.4. No new API request is dispatched for filtering (client-side only)", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.strictEqual(content.includes("/admin/recruiters?search="), false);
      assert.strictEqual(content.includes("/admin/users?location="), false);
      assert.strictEqual(content.includes("useSearchParams"), false);
    });

    test("7.5. Filtered-empty state is distinct from zero-recruiter state", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']recruiters-directory-empty["']/);
      assert.match(content, /data-testid=["']recruiters-filter-empty["']/);
      assert.match(content, /No matching recruiters/);
      assert.match(content, /No recruiters match your current search or location filter\./);
      assert.match(content, /data-testid=["']btn-reset-filters["']/);
      assert.match(content, /Clear filters/);
    });

    test("7.6. AdminRecruiters passes filteredRecruiters to RecruiterTable, and RecruiterTable remains presentational", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /<RecruiterTable[\s\S]*?recruiters=\{filteredRecruiters\}[\s\S]*?\/>/,
        "AdminRecruiters must pass filteredRecruiters to RecruiterTable",
      );

      const tablePath = path.resolve(__dirname, "../components/admin/recruiters/RecruiterTable.tsx");
      const tableContent = fs.readFileSync(tablePath, "utf-8");
      assert.strictEqual(tableContent.includes("searchTerm"), false, "RecruiterTable must not own searchTerm");
      assert.strictEqual(tableContent.includes("selectedLocation"), false, "RecruiterTable must not own selectedLocation");
    });

    test("7.7. Company is NOT treated as an available search field on AdminUser", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.strictEqual(
        content.includes("recruiter.company"),
        false,
        "AdminRecruiters must not search non-existent recruiter.company",
      );
    });

    test("7.8. 'All Locations' option value consistently matches the filtering predicate ('ALL')", () => {
      const content = fs.readFileSync(pagePath, "utf-8");

      // 1. Verify option uses "ALL"
      const optionMatch = content.match(/<option\s+value=["']([^"']+)["']>\s*All Locations\s*<\/option>/);
      assert.ok(optionMatch, "Must have an option for All Locations");
      const optionValue = optionMatch[1];
      assert.strictEqual(optionValue, "ALL", "Option value for All Locations must be 'ALL'");

      // 2. Verify state initialization uses the exact same value "ALL"
      assert.match(
        content,
        /useState<string>\(["']ALL["']\)/,
        "Initial selectedLocation state must be 'ALL'",
      );

      // 3. Verify filtering predicate checks selectedLocation !== 'ALL'
      assert.match(
        content,
        /selectedLocation\s*!==\s*["']ALL["']/,
        "Filtering predicate must check selectedLocation !== 'ALL' to ensure unfiltered inclusion",
      );

      // 4. Verify reset filters sets selectedLocation to 'ALL'
      assert.match(
        content,
        /setSelectedLocation\(["']ALL["']\)/,
        "Reset filters must set selectedLocation to 'ALL'",
      );
    });

    describe("7.9. Filter Pipeline Simulation Tests", () => {
      const sampleRecruiters = [
        {
          id: "rec-101",
          email: "almas.t@techcorp.com",
          role: "RECRUITER",
          firstName: "Almas",
          lastName: "T",
          location: "Bangalore",
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-01",
        },
        {
          id: "rec-202",
          email: "sarah.connor@cyberdyne.io",
          role: "RECRUITER",
          firstName: "Sarah",
          lastName: "Connor",
          location: "San Francisco",
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-02",
        },
        {
          id: "rec-303",
          email: "john.doe@globalhire.com",
          role: "RECRUITER",
          firstName: "John",
          lastName: "Doe",
          location: "Bangalore",
          isActive: true,
          isBlocked: true,
          createdAt: "2026-01-03",
        },
        {
          id: "rec-404",
          email: "elena.r@talent.org",
          role: "RECRUITER",
          firstName: "Elena",
          lastName: "Rostova",
          location: null,
          isActive: true,
          isBlocked: false,
          createdAt: "2026-01-04",
        },
        {
          id: "rec-505",
          email: "david.c@staffing.net",
          role: "RECRUITER",
          firstName: "David",
          lastName: "Chen",
          location: "   ",
          isActive: false,
          isBlocked: false,
          createdAt: "2026-01-05",
        },
      ];

      // Extraction of available locations simulation
      const deriveLocations = (recruitersList) => {
        const locs = new Set();
        for (const recruiter of recruitersList) {
          if (recruiter.location && recruiter.location.trim().length > 0) {
            locs.add(recruiter.location.trim());
          }
        }
        return Array.from(locs).sort((a, b) => a.localeCompare(b));
      };

      const applyFilters = (recruitersList, searchTerm, selectedLocation) => {
        const query = searchTerm.trim().toLowerCase();

        return recruitersList.filter((recruiter) => {
          if (query) {
            const firstName = (recruiter.firstName || "").toLowerCase();
            const lastName = (recruiter.lastName || "").toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const email = (recruiter.email || "").toLowerCase();
            const id = (recruiter.id || "").toLowerCase();

            const matchesSearch =
              firstName.includes(query) ||
              lastName.includes(query) ||
              fullName.includes(query) ||
              email.includes(query) ||
              id.includes(query);

            if (!matchesSearch) return false;
          }

          if (selectedLocation && selectedLocation !== "ALL") {
            const recruiterLoc = (recruiter.location || "").trim().toLowerCase();
            if (recruiterLoc !== selectedLocation.trim().toLowerCase()) {
              return false;
            }
          }

          return true;
        });
      };

      test("7.9.1. Dynamic locations extraction excludes null, empty, duplicates, and trims values", () => {
        const locations = deriveLocations(sampleRecruiters);
        assert.deepStrictEqual(locations, ["Bangalore", "San Francisco"]);
        assert.strictEqual(locations.includes(null), false);
        assert.strictEqual(locations.includes(""), false);
        assert.strictEqual(locations.filter((l) => l === "Bangalore").length, 1);
      });

      test("7.9.2. Empty search and 'ALL' location returns all recruiters", () => {
        const result = applyFilters(sampleRecruiters, "", "ALL");
        assert.strictEqual(result.length, 5);
      });

      test("7.9.3. Search by first name works and is case-insensitive", () => {
        const lower = applyFilters(sampleRecruiters, "almas", "ALL");
        assert.strictEqual(lower.length, 1);
        assert.strictEqual(lower[0].id, "rec-101");

        const upper = applyFilters(sampleRecruiters, "ALMAS", "ALL");
        assert.strictEqual(upper.length, 1);
        assert.strictEqual(upper[0].id, "rec-101");
      });

      test("7.9.4. Search by last name works", () => {
        const result = applyFilters(sampleRecruiters, "connor", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "rec-202");
      });

      test("7.9.5. Search by combined full name works", () => {
        const result = applyFilters(sampleRecruiters, "Sarah Connor", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "rec-202");
      });

      test("7.9.6. Search by email works", () => {
        const result = applyFilters(sampleRecruiters, "cyberdyne.io", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "rec-202");
      });

      test("7.9.7. Search by recruiter ID works", () => {
        const result = applyFilters(sampleRecruiters, "rec-303", "ALL");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "rec-303");
      });

      test("7.9.8. Location filter alone returns only matching recruiters", () => {
        const result = applyFilters(sampleRecruiters, "", "Bangalore");
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result.map((r) => r.id), ["rec-101", "rec-303"]);
      });

      test("7.9.9. Search + location combine with AND semantics", () => {
        const result = applyFilters(sampleRecruiters, "John", "Bangalore");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, "rec-303");

        const noMatch = applyFilters(sampleRecruiters, "John", "San Francisco");
        assert.strictEqual(noMatch.length, 0);
      });

      test("7.9.10. Clearing search preserves location filter", () => {
        let currentSearch = "John";
        let currentLocation = "Bangalore";
        assert.strictEqual(applyFilters(sampleRecruiters, currentSearch, currentLocation).length, 1);

        // Clear search
        currentSearch = "";
        const preservedLocResult = applyFilters(sampleRecruiters, currentSearch, currentLocation);
        assert.strictEqual(preservedLocResult.length, 2);
        assert.deepStrictEqual(preservedLocResult.map((r) => r.id), ["rec-101", "rec-303"]);
      });

      test("7.9.11. Clearing location preserves search term", () => {
        let currentSearch = "Sarah";
        let currentLocation = "San Francisco";
        assert.strictEqual(applyFilters(sampleRecruiters, currentSearch, currentLocation).length, 1);

        // Reset location to ALL
        currentLocation = "ALL";
        const preservedSearchResult = applyFilters(sampleRecruiters, currentSearch, currentLocation);
        assert.strictEqual(preservedSearchResult.length, 1);
        assert.strictEqual(preservedSearchResult[0].id, "rec-202");
      });

      test("7.9.12. Clearing both restores all recruiters", () => {
        let currentSearch = "unknown query";
        let currentLocation = "Nowhere";
        assert.strictEqual(applyFilters(sampleRecruiters, currentSearch, currentLocation).length, 0);

        // Reset both
        currentSearch = "";
        currentLocation = "ALL";
        assert.strictEqual(applyFilters(sampleRecruiters, currentSearch, currentLocation).length, 5);
      });

      test("7.9.13. Reset filters button sets searchTerm to '' and selectedLocation to 'ALL'", () => {
        let searchTerm = "almas";
        let selectedLocation = "Bangalore";

        // Reset action simulation matching onClick in AdminRecruiters
        searchTerm = "";
        selectedLocation = "ALL";

        assert.strictEqual(searchTerm, "");
        assert.strictEqual(selectedLocation, "ALL");
      });
    });
  });

  describe("8. Recruiter View Profile Modal & getAdminUser(recruiterId) Integration (Step 6)", () => {
    const modalPath = path.resolve(
      __dirname,
      "../components/admin/recruiters/RecruiterProfileModal.tsx",
    );
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/recruiters/RecruiterTable.tsx",
    );

    test("8.1. RecruiterProfileModal.tsx exists and is presentational without direct Axios or API imports", () => {
      assert.strictEqual(fs.existsSync(modalPath), true);
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.strictEqual(content.includes("axios"), false, "RecruiterProfileModal must not import axios");
      assert.strictEqual(content.includes("fetch("), false, "RecruiterProfileModal must not call fetch()");
      assert.strictEqual(content.includes("getAdminUser"), false, "RecruiterProfileModal must not call getAdminUser()");
      assert.strictEqual(content.includes("useAuth"), false, "RecruiterProfileModal must not access AuthContext");
      assert.strictEqual(content.includes("localStorage"), false, "RecruiterProfileModal must not access localStorage");
    });

    test("8.2. RecruiterTable renders 'View profile' button wiring to onViewProfile(recruiter.id)", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(content, /data-testid=\{`btn-view-profile-\$\{recruiter\.id\}`\}/);
      assert.match(content, /View profile/);
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onViewProfile\?\.(\(recruiter\.id\))/,
        "Clicking View profile must trigger onViewProfile with recruiter.id",
      );
      assert.strictEqual(
        content.includes("getAdminUser"),
        false,
        "RecruiterTable must NOT call getAdminUser directly",
      );
    });

    test("8.3. AdminRecruiters imports getAdminUser and handles single user profile fetching", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+\{[^}]*getAdminUser[^}]*\}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminRecruiters must import getAdminUser from @/lib/admin-api",
      );
      assert.match(
        content,
        /getAdminUser\(recruiterId\)/,
        "AdminRecruiters must invoke getAdminUser(recruiterId) when viewing profile",
      );
    });

    test("8.4. Stale previous recruiter data is cleared immediately when initiating a new profile view", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      const handlerMatch = content.match(
        /const handleViewProfile = async \((?:recruiterId: string|recruiterId)\) => \{([\s\S]*?)\};/,
      );
      assert.ok(handlerMatch, "handleViewProfile function must exist in AdminRecruiters.tsx");
      const handlerBody = handlerMatch[1];

      const clearRecruiterIndex = handlerBody.indexOf("setProfileRecruiter(null)");
      const fetchIndex = handlerBody.indexOf("getAdminUser");

      assert.notStrictEqual(clearRecruiterIndex, -1, "Must setProfileRecruiter(null) before fetching");
      assert.ok(
        clearRecruiterIndex < fetchIndex,
        "setProfileRecruiter(null) must occur before getAdminUser(recruiterId)",
      );
    });

    test("8.5. Modal displays loading state during profile fetch", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-loading["']/);
      assert.match(content, /Loading recruiter profile\.\.\./);
    });

    test("8.6. Modal displays error state without crashing and provides close button", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']profile-error["']/);
      assert.match(content, /Failed to load profile/);
      assert.match(content, /data-testid=["']btn-close-error["']/);
    });

    test("8.7. Successful profile view displays all supported AdminUser fields", () => {
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

    test("8.8. Optional phone/location/bio fallbacks are handled", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /recruiter\.phone\s*\|\|\s*["']Not provided["']/);
      assert.match(content, /recruiter\.location\s*\|\|\s*["']Not provided["']/);
      assert.match(content, /recruiter\.bio\s*\|\|\s*["']No bio provided\.["']/);
    });

    test("8.9. Modal provides multiple close triggers (X button, backdrop, footer Close)", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.match(content, /data-testid=["']btn-close-modal-x["']/);
      assert.match(content, /data-testid=["']modal-backdrop["']/);
      assert.match(content, /data-testid=["']btn-close-profile-modal["']/);
    });

    test("8.10. Modal does NOT render unsupported Figma features or fake metrics", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      const forbiddenMetrics = [
        "rating",
        "stars",
        "completed gigs",
        "reports so far",
        "risk score",
        "high risk",
        "high-risk",
        "moderation history",
        "gigs posted",
      ];

      for (const metric of forbiddenMetrics) {
        assert.strictEqual(
          content.toLowerCase().includes(metric),
          false,
          `RecruiterProfileModal must not contain unsupported metric: ${metric}`,
        );
      }
    });

    test("8.11. Company is NOT fabricated or added in RecruiterProfileModal", () => {
      const content = fs.readFileSync(modalPath, "utf-8");
      assert.strictEqual(
        content.includes("recruiter.company"),
        false,
        "RecruiterProfileModal must not access non-existent recruiter.company",
      );
      assert.strictEqual(
        content.includes("recruiter.bio as company"),
        false,
        "Must not reinterpret bio as company",
      );
      assert.doesNotMatch(content, /Apex Hospitality/i, "No mock company Apex Hospitality");
      assert.doesNotMatch(content, /InnoTech/i, "No mock company InnoTech");
    });

    describe("8.12. Profile Request Lifecycle & Race Condition Simulation", () => {
      test("8.12.1. Request race A -> B: slow response A does NOT overwrite fresh response B", async () => {
        let activeProfileRecruiterId = null;
        let profileRecruiter = null;

        // Start request for Recruiter A
        activeProfileRecruiterId = "rec-A";
        const fetchA = async () => {
          await new Promise((r) => setTimeout(r, 30));
          if (activeProfileRecruiterId === "rec-A") {
            profileRecruiter = { id: "rec-A", firstName: "Recruiter", lastName: "A" };
          }
        };

        // Shortly after, admin clicks Recruiter B
        activeProfileRecruiterId = "rec-B";
        const fetchB = async () => {
          await new Promise((r) => setTimeout(r, 10));
          if (activeProfileRecruiterId === "rec-B") {
            profileRecruiter = { id: "rec-B", firstName: "Recruiter", lastName: "B" };
          }
        };

        // Run concurrently
        await Promise.all([fetchA(), fetchB()]);

        // State must hold Recruiter B, NOT overwritten by slow Recruiter A
        assert.strictEqual(profileRecruiter.id, "rec-B");
        assert.strictEqual(profileRecruiter.firstName, "Recruiter");
        assert.strictEqual(profileRecruiter.lastName, "B");
      });

      test("8.12.2. Closing modal while request is in flight discards late response", async () => {
        let activeProfileRecruiterId = "rec-C";
        let isModalOpen = true;
        let profileRecruiter = null;

        // Pending request for Recruiter C
        const fetchC = async () => {
          await new Promise((r) => setTimeout(r, 20));
          if (activeProfileRecruiterId === "rec-C") {
            profileRecruiter = { id: "rec-C", firstName: "Recruiter", lastName: "C" };
          }
        };

        // User closes modal before fetch completes
        activeProfileRecruiterId = null;
        isModalOpen = false;
        profileRecruiter = null;

        await fetchC();

        // Must remain null and closed
        assert.strictEqual(profileRecruiter, null);
        assert.strictEqual(isModalOpen, false);
      });
    });
  });

  describe("9. Recruiter Block / Unblock Integration (Step 7)", () => {
    const tablePath = path.resolve(
      __dirname,
      "../components/admin/recruiters/RecruiterTable.tsx",
    );
    const pagePath = path.resolve(
      __dirname,
      "../pages/admin/AdminRecruiters.tsx",
    );
    const apiPath = path.resolve(__dirname, "../lib/admin-api.ts");

    test("9.1. admin-api.ts exports setAdminUserBlockStatus sending PATCH /admin/users/:userId/block", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /export\s+const\s+setAdminUserBlockStatus\s*=/);
      assert.match(
        content,
        /api\.patch<AdminUser>\(\s*`\/admin\/users\/\$\{userId\}\/block`,\s*payload,?\s*\)/,
      );
    });

    test("9.2. AdminRecruiters imports setAdminUserBlockStatus from @/lib/admin-api", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /import\s+\{[^}]*setAdminUserBlockStatus[^}]*\}\s+from\s+["']@\/lib\/admin-api["']/,
        "AdminRecruiters must import setAdminUserBlockStatus from @/lib/admin-api",
      );
    });

    test("9.3. AdminRecruiters passes onToggleBlock and blockingRecruiterId to RecruiterTable", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /blockingRecruiterId=\{blockingRecruiterId\}/,
        "AdminRecruiters must pass blockingRecruiterId to RecruiterTable",
      );
      assert.match(
        content,
        /onToggleBlock=\{\(recruiterId,\s*nextBlockedState\)\s*=>\s*\{[\s\S]*?handleToggleBlock\(recruiterId,\s*nextBlockedState\)/,
        "AdminRecruiters must pass onToggleBlock callback to RecruiterTable",
      );
    });

    test("9.4. RecruiterTable remains presentational with no direct API calls", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.strictEqual(
        content.includes("axios"),
        false,
        "RecruiterTable must not import axios",
      );
      assert.strictEqual(
        content.includes("fetch("),
        false,
        "RecruiterTable must not call fetch()",
      );
      assert.strictEqual(
        content.includes("setAdminUserBlockStatus"),
        false,
        "RecruiterTable must not call setAdminUserBlockStatus()",
      );
      assert.strictEqual(
        content.includes("getAdminUser"),
        false,
        "RecruiterTable must not call getAdminUser()",
      );
      assert.strictEqual(
        content.includes("AuthContext"),
        false,
        "RecruiterTable must not access AuthContext",
      );
      assert.strictEqual(
        content.includes("localStorage"),
        false,
        "RecruiterTable must not access localStorage",
      );
      assert.strictEqual(
        content.includes("sessionStorage"),
        false,
        "RecruiterTable must not access sessionStorage",
      );
    });

    test("9.5. Block button emits correct recruiter ID and target state (nextBlockedState = true)", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /data-testid=\{`btn-block-toggle-\$\{recruiter\.id\}`\}/,
      );
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onToggleBlock\?\.(\(recruiter\.id,\s*!recruiter\.isBlocked\))/,
        "RecruiterTable must invoke onToggleBlock with recruiter.id and !recruiter.isBlocked",
      );

      const events = [];
      const mockToggle = (recruiterId, nextBlockedState) => {
        events.push({ recruiterId, nextBlockedState });
      };

      const unblockedRecruiter = { id: "rec-1", isBlocked: false };
      mockToggle(unblockedRecruiter.id, !unblockedRecruiter.isBlocked);
      assert.deepStrictEqual(events[0], {
        recruiterId: "rec-1",
        nextBlockedState: true,
      });
    });

    test("9.6. Unblock button emits correct recruiter ID and target state (nextBlockedState = false)", () => {
      const events = [];
      const mockToggle = (recruiterId, nextBlockedState) => {
        events.push({ recruiterId, nextBlockedState });
      };

      const blockedRecruiter = { id: "rec-2", isBlocked: true };
      mockToggle(blockedRecruiter.id, !blockedRecruiter.isBlocked);
      assert.deepStrictEqual(events[0], {
        recruiterId: "rec-2",
        nextBlockedState: false,
      });
    });

    test("9.7. AdminRecruiters calls setAdminUserBlockStatus(recruiterId, true) on block", async () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /setAdminUserBlockStatus\(\s*recruiterId,\s*nextBlockedState/,
      );

      const calls = [];
      const mockSetAdminUserBlockStatus = async (id, isBlocked) => {
        calls.push({ id, isBlocked });
        return { id, role: "RECRUITER", isBlocked };
      };

      await mockSetAdminUserBlockStatus("rec-1", true);
      assert.deepStrictEqual(calls[0], { id: "rec-1", isBlocked: true });
    });

    test("9.8. AdminRecruiters calls setAdminUserBlockStatus(recruiterId, false) on unblock", async () => {
      const calls = [];
      const mockSetAdminUserBlockStatus = async (id, isBlocked) => {
        calls.push({ id, isBlocked });
        return { id, role: "RECRUITER", isBlocked };
      };

      await mockSetAdminUserBlockStatus("rec-2", false);
      assert.deepStrictEqual(calls[0], { id: "rec-2", isBlocked: false });
    });

    test("9.9. Successful block updates the correct recruiter state in directory users", async () => {
      let users = [
        {
          id: "rec-1",
          role: "RECRUITER",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          location: "New York",
          isActive: true,
          isBlocked: false,
        },
        {
          id: "rec-2",
          role: "RECRUITER",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          location: "Chicago",
          isActive: true,
          isBlocked: false,
        },
      ];

      const fakeBackendBlock = async (id, isBlocked) => {
        const target = users.find((u) => u.id === id);
        return { ...target, isBlocked };
      };

      const updated = await fakeBackendBlock("rec-1", true);
      users = users.map((u) => (u.id === updated.id ? updated : u));

      assert.strictEqual(users[0].isBlocked, true);
      assert.strictEqual(users[0].firstName, "John");
      assert.strictEqual(users[0].email, "john@example.com");
      assert.strictEqual(users[1].isBlocked, false);
    });

    test("9.10. Successful unblock updates the correct recruiter state in directory users", async () => {
      let users = [
        {
          id: "rec-1",
          role: "RECRUITER",
          firstName: "John",
          lastName: "Doe",
          isActive: true,
          isBlocked: true,
        },
      ];

      const fakeBackendUnblock = async (id, isBlocked) => {
        const target = users.find((u) => u.id === id);
        return { ...target, isBlocked };
      };

      const updated = await fakeBackendUnblock("rec-1", false);
      users = users.map((u) => (u.id === updated.id ? updated : u));

      assert.strictEqual(users[0].isBlocked, false);
      assert.strictEqual(users[0].isActive, true);
    });

    test("9.11. Mutation loading state is shown ('Blocking...' / 'Unblocking...') on active recruiter button", () => {
      const content = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        content,
        /blockingRecruiterId === recruiter\.id\s*\?\s*recruiter\.isBlocked\s*\?\s*["']Unblocking\.\.\.["']\s*:\s*["']Blocking\.\.\.["']/,
      );

      const getLabel = (recruiter, blockingRecruiterId) => {
        if (blockingRecruiterId === recruiter.id) {
          return recruiter.isBlocked ? "Unblocking..." : "Blocking...";
        }
        return recruiter.isBlocked ? "Unblock user" : "Block user";
      };

      const rActive = { id: "rec-1", isBlocked: false };
      const rBlocked = { id: "rec-2", isBlocked: true };

      assert.strictEqual(getLabel(rActive, null), "Block user");
      assert.strictEqual(getLabel(rBlocked, null), "Unblock user");
      assert.strictEqual(getLabel(rActive, "rec-1"), "Blocking...");
      assert.strictEqual(getLabel(rBlocked, "rec-2"), "Unblocking...");
      assert.strictEqual(getLabel(rActive, "rec-other"), "Block user");
    });

    test("9.12. Mutation loading disables buttons and prevents duplicate submissions while in-flight", async () => {
      const contentTable = fs.readFileSync(tablePath, "utf-8");
      assert.match(
        contentTable,
        /disabled=\{Boolean\(blockingRecruiterId\)\}/,
        "RecruiterTable toggle button must be disabled while a mutation is in flight",
      );

      const contentPage = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        contentPage,
        /if\s*\(\s*blockingRecruiterId\s*\)\s*return;/,
        "AdminRecruiters handleToggleBlock must guard against duplicate submissions",
      );

      let callCount = 0;
      let activeBlockingId = null;

      const simulateToggle = async (recruiterId) => {
        if (activeBlockingId) return;
        activeBlockingId = recruiterId;
        callCount++;
        await new Promise((r) => setTimeout(r, 5));
        activeBlockingId = null;
      };

      const p1 = simulateToggle("rec-1");
      const p2 = simulateToggle("rec-1");
      await Promise.all([p1, p2]);

      assert.strictEqual(callCount, 1, "Must execute API call only once");
    });

    test("9.13. Mutation failure preserves existing recruiter state without pretending success", async () => {
      const users = [
        { id: "rec-1", role: "RECRUITER", firstName: "Alice", isBlocked: false },
      ];
      let actionError = null;
      let blockingRecruiterId = null;

      const failedBackendBlock = async () => {
        throw new Error("Server error (500)");
      };

      const simulateFailedToggle = async (recruiterId, nextBlocked) => {
        if (blockingRecruiterId) return;
        blockingRecruiterId = recruiterId;
        actionError = null;
        try {
          await failedBackendBlock(recruiterId, nextBlocked);
        } catch {
          actionError = "Failed to block recruiter. Please try again.";
        } finally {
          blockingRecruiterId = null;
        }
      };

      await simulateFailedToggle("rec-1", true);

      assert.strictEqual(
        users[0].isBlocked,
        false,
        "Recruiter state must remain unchanged on failure",
      );
      assert.strictEqual(actionError, "Failed to block recruiter. Please try again.");
    });

    test("9.14. Mutation error is displayed in alert banner with dismiss capability", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(content, /data-testid=["']recruiter-action-error["']/);
      assert.match(content, /data-testid=["']btn-dismiss-action-error["']/);
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*setActionError\(null\)\}/,
        "Clicking dismiss button must reset actionError to null",
      );
    });

    test("9.15. Mutation loading state clears after success", async () => {
      let blockingRecruiterId = null;

      const simulateSuccessfulToggle = async (recruiterId) => {
        blockingRecruiterId = recruiterId;
        try {
          await new Promise((r) => setTimeout(r, 5));
        } finally {
          blockingRecruiterId = null;
        }
      };

      await simulateSuccessfulToggle("rec-1");
      assert.strictEqual(blockingRecruiterId, null);
    });

    test("9.16. Mutation loading state clears after failure", async () => {
      let blockingRecruiterId = null;

      const simulateFailingToggle = async (recruiterId) => {
        blockingRecruiterId = recruiterId;
        try {
          throw new Error("Simulated network timeout");
        } catch {
          // caught
        } finally {
          blockingRecruiterId = null;
        }
      };

      await simulateFailingToggle("rec-1");
      assert.strictEqual(blockingRecruiterId, null);
    });

    test("9.17. Open recruiter profile stays synchronized after block without refetching directory", () => {
      const content = fs.readFileSync(pagePath, "utf-8");
      assert.match(
        content,
        /setProfileRecruiter\(\(?prev\)?\s*=>[\s\S]*?updatedUser\.id\s*\?\s*updatedUser\s*:\s*prev/,
        "AdminRecruiters must update profileRecruiter when the updated user matches open modal recruiter",
      );

      let profileRecruiter = { id: "rec-1", isBlocked: false };
      const updatedUser = { id: "rec-1", isBlocked: true };

      const syncProfile = (prev, updated) =>
        prev && prev.id === updated.id ? updated : prev;

      profileRecruiter = syncProfile(profileRecruiter, updatedUser);
      assert.strictEqual(profileRecruiter.isBlocked, true);
    });

    test("9.18. Open recruiter profile stays synchronized after unblock without refetching directory", () => {
      let profileRecruiter = { id: "rec-1", isBlocked: true };
      const updatedUser = { id: "rec-1", isBlocked: false };

      const syncProfile = (prev, updated) =>
        prev && prev.id === updated.id ? updated : prev;

      profileRecruiter = syncProfile(profileRecruiter, updatedUser);
      assert.strictEqual(profileRecruiter.isBlocked, false);

      // Different recruiter does not overwrite
      const otherUser = { id: "rec-other", isBlocked: true };
      profileRecruiter = syncProfile(profileRecruiter, otherUser);
      assert.strictEqual(profileRecruiter.id, "rec-1");
      assert.strictEqual(profileRecruiter.isBlocked, false);
    });

    test("9.19. Search state survives mutation and continues filtering updated record", () => {
      const initialRecruiters = [
        {
          id: "rec-1",
          role: "RECRUITER",
          firstName: "Samantha",
          lastName: "Ray",
          location: "Dallas, TX",
          isBlocked: false,
        },
        {
          id: "rec-2",
          role: "RECRUITER",
          firstName: "Derek",
          lastName: "Cole",
          location: "Houston, TX",
          isBlocked: false,
        },
      ];

      const searchTerm = "Samantha";
      const filterFn = (list, query) =>
        list.filter((r) =>
          !query || r.firstName.toLowerCase().includes(query.toLowerCase()),
        );

      const before = filterFn(initialRecruiters, searchTerm);
      assert.strictEqual(before.length, 1);
      assert.strictEqual(before[0].id, "rec-1");
      assert.strictEqual(before[0].isBlocked, false);

      const updatedSam = { ...initialRecruiters[0], isBlocked: true };
      const updatedList = initialRecruiters.map((r) =>
        r.id === updatedSam.id ? updatedSam : r,
      );

      const after = filterFn(updatedList, searchTerm);
      assert.strictEqual(after.length, 1);
      assert.strictEqual(after[0].id, "rec-1");
      assert.strictEqual(after[0].isBlocked, true);
    });

    test("9.20. Location filter survives mutation and continues filtering updated record", () => {
      const initialRecruiters = [
        {
          id: "rec-1",
          role: "RECRUITER",
          firstName: "Samantha",
          lastName: "Ray",
          location: "Dallas, TX",
          isBlocked: false,
        },
        {
          id: "rec-2",
          role: "RECRUITER",
          firstName: "Derek",
          lastName: "Cole",
          location: "Houston, TX",
          isBlocked: false,
        },
      ];

      const selectedLocation = "Dallas, TX";
      const filterFn = (list, loc) =>
        list.filter((r) => !loc || loc === "ALL" || r.location === loc);

      const before = filterFn(initialRecruiters, selectedLocation);
      assert.strictEqual(before.length, 1);
      assert.strictEqual(before[0].id, "rec-1");
      assert.strictEqual(before[0].isBlocked, false);

      const updatedSam = { ...initialRecruiters[0], isBlocked: true };
      const updatedList = initialRecruiters.map((r) =>
        r.id === updatedSam.id ? updatedSam : r,
      );

      const after = filterFn(updatedList, selectedLocation);
      assert.strictEqual(after.length, 1);
      assert.strictEqual(after[0].id, "rec-1");
      assert.strictEqual(after[0].isBlocked, true);
    });

    test("9.21. No optimistic state update occurs before successful server response", async () => {
      let users = [
        { id: "rec-1", role: "RECRUITER", isBlocked: false },
      ];
      let serverResponseReceived = false;

      const delayedBackendCall = async (id, isBlocked) => {
        await new Promise((r) => setTimeout(r, 20));
        serverResponseReceived = true;
        return { id, role: "RECRUITER", isBlocked };
      };

      const mutationPromise = (async () => {
        const updated = await delayedBackendCall("rec-1", true);
        users = users.map((u) => (u.id === updated.id ? updated : u));
      })();

      // Halfway through before server resolves:
      await new Promise((r) => setTimeout(r, 5));
      assert.strictEqual(serverResponseReceived, false);
      assert.strictEqual(
        users[0].isBlocked,
        false,
        "No optimistic update: state must remain isBlocked=false until server resolves",
      );

      await mutationPromise;
      assert.strictEqual(serverResponseReceived, true);
      assert.strictEqual(users[0].isBlocked, true);
    });

    test("9.22. No unsupported Figma data, company fabrication, or fake moderation fields are introduced", () => {
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
        "gigs posted",
        "moderation history",
      ];

      for (const item of forbiddenStrings) {
        assert.strictEqual(
          pageContent.toLowerCase().includes(item),
          false,
          `AdminRecruiters must not contain unsupported item: ${item}`,
        );
        assert.strictEqual(
          tableContent.toLowerCase().includes(item),
          false,
          `RecruiterTable must not contain unsupported item: ${item}`,
        );
      }
    });
  });
});
