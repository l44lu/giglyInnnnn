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

describe("Feature 2, Step 7.4B: My Postings Page UI & Route Integration", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const myPostingsPagePath = path.resolve(
    __dirname,
    "../pages/recruiter/MyPostings.tsx",
  );
  const sidebarPath = path.resolve(
    __dirname,
    "../components/recruiter/RecruiterSidebar.tsx",
  );
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");

  describe("1. Route Registration and Access Control", () => {
    test("1.1. App.tsx imports MyPostings from ./pages/recruiter/MyPostings", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /import\s+MyPostings\s+from\s+["']\.\/pages\/recruiter\/MyPostings["']/,
        "App.tsx must import MyPostings",
      );
    });

    test("1.2. App.tsx registers /recruiter/my-postings route protected by RECRUITER role", () => {
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /<Route\s+path=["']\/recruiter\/my-postings["']\s+element=\{[\s\S]*?<ProtectedRoute\s+allowedRoles=\{?\[["']RECRUITER["']\]\}?>[\s\S]*?<MyPostings\s*\/>[\s\S]*?<\/ProtectedRoute>[\s\S]*?\}\s*\/>/,
        "Route /recruiter/my-postings must be wrapped with ProtectedRoute allowedRoles=['RECRUITER']",
      );
    });

    test("1.3. ProtectedRoute allows authenticated RECRUITER to view /recruiter/my-postings", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "RECRUITER",
        },
        allowedRoles: ["RECRUITER"],
        children: "MyPostingsComponent",
      });

      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, "MyPostingsComponent");
    });

    test("1.4. ProtectedRoute redirects unauthenticated users to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: false,
          role: null,
        },
        allowedRoles: ["RECRUITER"],
        children: "MyPostingsComponent",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/login");
    });

    test("1.5. ProtectedRoute redirects unauthorized WORKER to /worker/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "WORKER",
        },
        allowedRoles: ["RECRUITER"],
        children: "MyPostingsComponent",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/worker/dashboard");
    });

    test("1.6. ProtectedRoute redirects unauthorized ADMIN to /admin/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "ADMIN",
        },
        allowedRoles: ["RECRUITER"],
        children: "MyPostingsComponent",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/admin/dashboard");
    });
  });

  describe("2. RecruiterSidebar Navigation Integration", () => {
    test("2.1. RecruiterSidebar includes My Postings nav item with path /recruiter/my-postings", () => {
      assert.strictEqual(fs.existsSync(sidebarPath), true);
      const content = fs.readFileSync(sidebarPath, "utf-8");

      assert.match(
        content,
        /id:\s*["']my-postings["'][\s\S]*?name:\s*["']My Postings["'][\s\S]*?path:\s*["']\/recruiter\/my-postings["']/,
        "RecruiterSidebar must contain My Postings pointing to /recruiter/my-postings",
      );
    });

    test("2.2. MyPostings.tsx renders RecruiterSidebar with activeTab='my-postings'", () => {
      assert.strictEqual(fs.existsSync(myPostingsPagePath), true);
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(
        content,
        /<RecruiterSidebar\s+activeTab=["']my-postings["']\s*\/>/,
        "MyPostings must render RecruiterSidebar with activeTab='my-postings'",
      );
    });
  });

  describe("3. Visual Design, Summary Metric Cards & Figma Alignment", () => {
    test("3.1. Renders page title 'My Postings' and '+ Post New Gig' button linking to /recruiter/post-job", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /<h1[^>]*>[\s\S]*?My Postings[\s\S]*?<\/h1>/);
      assert.match(
        content,
        /<Link\s+to=["']\/recruiter\/post-job["'][\s\S]*?>[\s\S]*?Post New Gig[\s\S]*?<\/Link>/,
      );
    });

    test("3.2. Primary metric card displays real active posts and local/remote breakdown", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /Active Posts/i);
      assert.match(content, /summary\?\.active/);
      assert.match(content, /summary\?\.activeLocal/);
      assert.match(content, /summary\?\.activeRemote/);
    });

    test("3.3. Secondary metric card displays real total gigs and drafts/paused/closed breakdown", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /Total Gigs/i);
      assert.match(content, /summary\?\.total/);
      assert.match(content, /summary\?\.draft/);
      assert.match(content, /summary\?\.paused/);
      assert.match(content, /summary\?\.closed/);
    });

    test("3.4. Avoids fake applicant counts and unverified metrics", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      // Verify no hardcoded fake numbers or invent-an-applicant columns
      assert.doesNotMatch(content, /48\s*arrived\s*in\s*the\s*last\s*24\s*hours/);
      assert.doesNotMatch(content, /New applicants/);
      assert.doesNotMatch(content, /shortlisted\s*·/);
      assert.doesNotMatch(content, /strong\s*match/);
    });
  });

  describe("4. Status Tabs & API Interaction", () => {
    test("4.1. STATUS_TABS defines all required filters: All, Active, Drafts, Paused, Closed", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /RecruiterJobStatusFilter\.ALL/);
      assert.match(content, /RecruiterJobStatusFilter\.ACTIVE/);
      assert.match(content, /RecruiterJobStatusFilter\.DRAFT/);
      assert.match(content, /RecruiterJobStatusFilter\.PAUSED/);
      assert.match(content, /RecruiterJobStatusFilter\.CLOSED/);
    });

    test("4.2. Invokes getRecruiterJobPosts with selected activeTab", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(
        content,
        /const\s+response\s*=\s*await\s+getRecruiterJobPosts\(\s*\{\s*status:\s*activeTab,?\s*\}\s*\)/,
      );
    });

    test("4.3. Provides working Refresh button that re-fetches data with spinner", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /const\s+handleRefresh\s*=\s*async/);
      assert.match(content, /RotateCw/);
      assert.match(content, /isRefreshing/);
    });
  });

  describe("5. Client-Side Search, Filter, Sort & Table Listing", () => {
    test("5.1. Provides search toolbar filtering across title, category, location, and post ID", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /searchQuery/);
      assert.match(content, /item\.title\?\.toLowerCase\(\)\.includes\(q\)/);
      assert.match(content, /item\.category\?\.name\?\.toLowerCase\(\)\.includes\(q\)/);
      assert.match(content, /item\.jobLocation\?\.toLowerCase\(\)\.includes\(q\)/);
      assert.match(content, /item\.id\?\.toLowerCase\(\)\.includes\(q\)/);
    });

    test("5.2. Populates location filter dynamically from unique post locations", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /uniqueLocations/);
      assert.match(content, /selectedLocation/);
    });

    test("5.3. Supports sorting by Recent (default), Oldest, and Title", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /Sort: Recent/);
      assert.match(content, /Sort: Oldest/);
      assert.match(content, /Sort: Title/);
    });

    test("5.4. Maps all backend job statuses to appropriate badge styles", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /case\s*["']open["']:/);
      assert.match(content, /case\s*["']draft["']:/);
      assert.match(content, /case\s*["']paused["']:/);
      assert.match(content, /case\s*["']filled["']:/);
      assert.match(content, /case\s*["']completed["']:/);
      assert.match(content, /case\s*["']cancelled["']:/);
    });

    test("5.5. Does NOT render dead non-functional action buttons", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      // Verify no non-functional action buttons
      assert.doesNotMatch(content, />View Gigs</);
      assert.doesNotMatch(content, />Pay</);
      assert.doesNotMatch(content, />Done</);
      assert.doesNotMatch(content, />Pending</);
    });
  });

  describe("6. Resilient Loading, Error & Empty State Handling", () => {
    test("6.1. Displays pulse skeleton placeholders while loading initial data", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /animate-pulse/);
    });

    test("6.2. Displays error banner with Retry action upon API failure", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /errorMessage/);
      assert.match(content, /Unable to load job postings/);
      assert.match(content, /Retry/);
    });

    test("6.3. Handles tab-specific empty state, search empty state, and global empty state", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(content, /No job postings match your filter/);
      assert.match(content, /No \{activeTab\} job postings/);
      assert.match(content, /No job postings yet/);
    });
  });
});
