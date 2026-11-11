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

describe("Feature 1, Step 6.2B: Post a New Gig — Form UI Implementation", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const postJobPagePath = path.resolve(
    __dirname,
    "../pages/recruiter/PostJob.tsx",
  );
  const basicInfoPath = path.resolve(
    __dirname,
    "../components/recruiter/job-posting/BasicInfoSection.tsx",
  );
  const jobDetailsPath = path.resolve(
    __dirname,
    "../components/recruiter/job-posting/JobDetailsSection.tsx",
  );
  const timeLocationPath = path.resolve(
    __dirname,
    "../components/recruiter/job-posting/TimeLocationSection.tsx",
  );
  const budgetPaymentPath = path.resolve(
    __dirname,
    "../components/recruiter/job-posting/BudgetPaymentSection.tsx",
  );
  const recruiterDashboardPath = path.resolve(
    __dirname,
    "../pages/recruiter/RecruiterDashboard.tsx",
  );
  const recruiterSidebarPath = path.resolve(
    __dirname,
    "../components/recruiter/RecruiterSidebar.tsx",
  );

  describe("1. Route Registration and Authorization in App.tsx", () => {
    test("1.1. App.tsx imports PostJob page component", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /import\s+PostJob\s+from\s+["']\.\/pages\/recruiter\/PostJob["']/,
        "App.tsx must import PostJob page",
      );
    });

    test("1.2. App.tsx registers /recruiter/post-job protected route for RECRUITER role only", () => {
      const content = fs.readFileSync(appPath, "utf-8");
      assert.match(
        content,
        /path=["']\/recruiter\/post-job["'][\s\S]*?allowedRoles=\{?\[["']RECRUITER["']\]\}?[\s\S]*?<PostJob\s*\/>/,
        "App.tsx must protect /recruiter/post-job with RECRUITER allowedRole",
      );
    });

    test("1.3. Authorization evaluation: unauthenticated redirected to /login", () => {
      const res = evaluateProtectedRoute({
        authContext: { isAuthenticated: false, isLoading: false, role: null },
        allowedRoles: ["RECRUITER"],
        children: "PostJobPage",
      });
      assert.strictEqual(res.status, "REDIRECT");
      assert.strictEqual(res.to, "/login");
    });

    test("1.4. Authorization evaluation: worker role redirected to /worker/dashboard", () => {
      const res = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "WORKER",
        },
        allowedRoles: ["RECRUITER"],
        children: "PostJobPage",
      });
      assert.strictEqual(res.status, "REDIRECT");
      assert.strictEqual(res.to, "/worker/dashboard");
    });

    test("1.5. Authorization evaluation: recruiter role allowed access", () => {
      const res = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "RECRUITER",
        },
        allowedRoles: ["RECRUITER"],
        children: "PostJobPage",
      });
      assert.strictEqual(res.status, "RENDER");
      assert.strictEqual(res.element, "PostJobPage");
    });
  });

  describe("2. Navigation Integration", () => {
    test("2.1. RecruiterSidebar navigation links to /recruiter/post-job", () => {
      assert.strictEqual(fs.existsSync(recruiterSidebarPath), true);
      const content = fs.readFileSync(recruiterSidebarPath, "utf-8");
      assert.match(
        content,
        /id:\s*["']post-job["'][\s\S]*?path:\s*["']\/recruiter\/post-job["']/,
        "RecruiterSidebar must contain navigation item for post-job pointing to /recruiter/post-job",
      );
    });

    test("2.2. RecruiterDashboard wires RecruiterHeroCards onPostJob to navigate to /recruiter/post-job", () => {
      assert.strictEqual(fs.existsSync(recruiterDashboardPath), true);
      const content = fs.readFileSync(recruiterDashboardPath, "utf-8");
      assert.match(
        content,
        /onPostJob=\{[\s\S]*?\/recruiter\/post-job[\s\S]*?\}/,
        "RecruiterDashboard must pass onPostJob callback to RecruiterHeroCards",
      );
    });
  });

  describe("3. PostJob Page Structure & Data Loading", () => {
    test("3.1. PostJob.tsx exists and renders RecruiterSidebar with activeTab='post-job'", () => {
      assert.strictEqual(fs.existsSync(postJobPagePath), true);
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      assert.match(
        content,
        /<RecruiterSidebar\s+activeTab=["']post-job["']\s*\/>/,
        "PostJob must render RecruiterSidebar with activeTab='post-job'",
      );
    });

    test("3.2. PostJob.tsx imports and executes getJobCategories and getSkillCatalog", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      assert.match(
        content,
        /import\s*\{[\s\S]*?getJobCategories[\s\S]*?\}\s*from\s*["']@\/lib\/job-api["']/,
      );
      assert.match(
        content,
        /import\s*\{\s*getSkillCatalog\s*\}\s*from\s*["']@\/lib\/worker-api["']/,
      );
      assert.match(content, /getJobCategories\(\)/);
      assert.match(content, /getSkillCatalog\(\)/);
    });

    test("3.3. PostJob.tsx renders the 4 modular form sections", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      assert.match(content, /<BasicInfoSection/);
      assert.match(content, /<JobDetailsSection/);
      assert.match(content, /<TimeLocationSection/);
      assert.match(content, /<BudgetPaymentSection/);
    });

    test("3.4. PostJob.tsx contains Save Draft, Cancel, and Post Job Now action buttons", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      assert.match(content, /Save Draft/);
      assert.match(content, /Cancel/);
      assert.match(content, /Post Job Now/);
    });

    test("3.5. PostJob.tsx wires Save Draft and Post Job Now actions with submission guards", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      // Check Save Draft has onClick and disabled guard
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*\{\s*void handleSaveDraft\(\);\s*\}\}/,
        "Save Draft button must be wired to handleSaveDraft",
      );
      assert.match(
        content,
        /disabled=\{isSubmitting \|\| Boolean\(savedDraftId\)\}/,
        "Save Draft button must have disabled guard for isSubmitting and savedDraftId",
      );
      // Check Post Job Now has onClick and disabled guard
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*\{\s*void handlePostJobNow\(\);\s*\}\}/,
        "Post Job Now button must be wired to handlePostJobNow",
      );
    });

    test("3.6. PostJob.tsx displays empty category state warning when categories array is empty", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");
      assert.match(
        content,
        /categories\.length === 0/,
        "PostJob must handle empty category list",
      );
      assert.match(content, /No job categories are currently available/);
    });
  });

  describe("4. Modular Form Section Contracts", () => {
    test("4.1. BasicInfoSection supports title, category selection, and WorkType segmented toggle", () => {
      assert.strictEqual(fs.existsSync(basicInfoPath), true);
      const content = fs.readFileSync(basicInfoPath, "utf-8");
      assert.match(content, /id="job-title"/);
      assert.match(content, /id="job-category"/);
      assert.match(content, /WorkType\.REMOTE/);
      assert.match(content, /WorkType\.LOCAL/);
      assert.match(content, /Remote/);
      assert.match(content, /On-site \/ Local/);
    });

    test("4.2. BasicInfoSection disables select when categories array is empty", () => {
      const content = fs.readFileSync(basicInfoPath, "utf-8");
      assert.match(
        content,
        /categories\.length === 0/,
        "BasicInfoSection must check for zero categories",
      );
      assert.match(content, /No categories available/);
    });

    test("4.3. JobDetailsSection supports description, catalog skills search/selection, and workersNeeded", () => {
      assert.strictEqual(fs.existsSync(jobDetailsPath), true);
      const content = fs.readFileSync(jobDetailsPath, "utf-8");
      assert.match(content, /id="job-description"/);
      assert.match(content, /id="skill-search-input"/);
      assert.match(content, /id="workers-needed"/);
      assert.match(content, /selectedSkillIds/);
      assert.match(content, /skillCatalog/);
    });

    test("4.4. TimeLocationSection supports startDate, estimatedDuration, shiftDuration, and plain-text jobLocation", () => {
      assert.strictEqual(fs.existsSync(timeLocationPath), true);
      const content = fs.readFileSync(timeLocationPath, "utf-8");
      assert.match(content, /id="start-date"/);
      assert.match(content, /id="estimated-duration"/);
      assert.match(content, /id="shift-duration"/);
      assert.match(content, /id="job-location"/);
      assert.match(content, /Required for On-site/);
      assert.strictEqual(
        content.includes("jobLocationLat"),
        false,
        "TimeLocationSection must NOT expose map coordinates",
      );
      assert.strictEqual(
        content.includes("jobLocationLng"),
        false,
        "TimeLocationSection must NOT expose map coordinates",
      );
    });

    test("4.5. BudgetPaymentSection supports PaymentStructure (Fixed / Hourly) and conditionally renders budget or rates", () => {
      assert.strictEqual(fs.existsSync(budgetPaymentPath), true);
      const content = fs.readFileSync(budgetPaymentPath, "utf-8");
      assert.match(content, /PaymentStructure\.FIXED/);
      assert.match(content, /PaymentStructure\.HOURLY/);
      assert.match(content, /id="budget-amount"/);
      assert.match(content, /id="hourly-rate"/);
      assert.match(content, /\/hr/);
      assert.strictEqual(
        content.includes("Pay On-site"),
        false,
        "BudgetPaymentSection must NOT include unsupported Pay On-site option",
      );
    });
  });
});
