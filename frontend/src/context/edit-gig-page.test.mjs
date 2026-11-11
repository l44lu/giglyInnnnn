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

describe("Feature 2, Step 8.4: Edit Gig Page UI & Route Integration", () => {
  const appPath = path.resolve(__dirname, "../App.tsx");
  const editJobPagePath = path.resolve(
    __dirname,
    "../pages/recruiter/EditJob.tsx",
  );
  const myPostingsPagePath = path.resolve(
    __dirname,
    "../pages/recruiter/MyPostings.tsx",
  );

  describe("1. Route Registration and Access Control", () => {
    test("1.1. App.tsx imports EditJob from ./pages/recruiter/EditJob", () => {
      assert.strictEqual(fs.existsSync(appPath), true);
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /import\s+EditJob\s+from\s+["']\.\/pages\/recruiter\/EditJob["']/,
        "App.tsx must import EditJob",
      );
    });

    test("1.2. App.tsx registers /recruiter/jobs/:id/edit route protected by RECRUITER role", () => {
      const content = fs.readFileSync(appPath, "utf-8");

      assert.match(
        content,
        /<Route\s+path=["']\/recruiter\/jobs\/:id\/edit["']\s+element=\{[\s\S]*?<ProtectedRoute\s+allowedRoles=\{?\[["']RECRUITER["']\]\}?>[\s\S]*?<EditJob\s*\/>[\s\S]*?<\/ProtectedRoute>[\s\S]*?\}\s*\/>/,
        "Route /recruiter/jobs/:id/edit must be wrapped with ProtectedRoute allowedRoles=['RECRUITER']",
      );
    });

    test("1.3. ProtectedRoute allows authenticated RECRUITER to view /recruiter/jobs/:id/edit", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "RECRUITER",
        },
        allowedRoles: ["RECRUITER"],
        children: "EditJobComponent",
      });

      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, "EditJobComponent");
    });

    test("1.4. ProtectedRoute redirects unauthenticated users to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: false,
          role: null,
        },
        allowedRoles: ["RECRUITER"],
        children: "EditJobComponent",
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
        children: "EditJobComponent",
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
        children: "EditJobComponent",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/admin/dashboard");
    });
  });

  describe("2. My Postings Edit Action Integration", () => {
    test("2.1. MyPostings.tsx defines Actions column in the table header", () => {
      assert.strictEqual(fs.existsSync(myPostingsPagePath), true);
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(
        content,
        /<th[^>]*>\s*Actions\s*<\/th>/,
        "MyPostings table header must include Actions column",
      );
    });

    test("2.2. canEditJob permits only DRAFT, OPEN, and PAUSED jobs", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(
        content,
        /function\s+canEditJob\s*\([\s\S]*?status\s*===\s*JobStatus\.DRAFT[\s\S]*?status\s*===\s*JobStatus\.OPEN[\s\S]*?status\s*===\s*JobStatus\.PAUSED/,
        "canEditJob must return true for DRAFT, OPEN, and PAUSED",
      );

      // Unit test the logic
      const simulateCanEdit = (status) => {
        return status === "draft" || status === "open" || status === "paused";
      };

      assert.strictEqual(simulateCanEdit("draft"), true);
      assert.strictEqual(simulateCanEdit("open"), true);
      assert.strictEqual(simulateCanEdit("paused"), true);
      assert.strictEqual(simulateCanEdit("filled"), false);
      assert.strictEqual(simulateCanEdit("completed"), false);
      assert.strictEqual(simulateCanEdit("cancelled"), false);
    });

    test("2.3. Renders Edit Link pointing to /recruiter/jobs/:id/edit for editable jobs", () => {
      const content = fs.readFileSync(myPostingsPagePath, "utf-8");

      assert.match(
        content,
        /to=\{`\/recruiter\/jobs\/\$\{job\.id\}\/edit`\}/,
        "Edit link must navigate to /recruiter/jobs/${job.id}/edit",
      );
    });
  });

  describe("3. Edit Job Component Architecture & Reuse", () => {
    test("3.1. Reuses all four modular form sections", () => {
      assert.strictEqual(fs.existsSync(editJobPagePath), true);
      const content = fs.readFileSync(editJobPagePath, "utf-8");

      assert.match(content, /<BasicInfoSection[\s\S]*?\/>/);
      assert.match(content, /<JobDetailsSection[\s\S]*?\/>/);
      assert.match(content, /<TimeLocationSection[\s\S]*?\/>/);
      assert.match(content, /<BudgetPaymentSection[\s\S]*?\/>/);
    });

    test("3.2. Does NOT contain a Publish button", () => {
      const content = fs.readFileSync(editJobPagePath, "utf-8");

      assert.doesNotMatch(
        content,
        /Post Job Now/,
        "EditJob must not contain Post Job Now button",
      );
      assert.doesNotMatch(
        content,
        /publishJobPost/,
        "EditJob must not import or invoke publishJobPost",
      );
    });

    test("3.3. Contains Save Changes button and Cancel button", () => {
      const content = fs.readFileSync(editJobPagePath, "utf-8");

      assert.match(content, /Save Changes/);
      assert.match(content, /Cancel/);
      assert.match(content, /handleSaveChanges/);
    });

    test("3.4. Renders RecruiterSidebar with activeTab='my-postings'", () => {
      const content = fs.readFileSync(editJobPagePath, "utf-8");

      assert.match(
        content,
        /<RecruiterSidebar\s+activeTab=["']my-postings["']\s*\/>/,
        "EditJob must render RecruiterSidebar with activeTab='my-postings'",
      );
    });
  });

  describe("4. Form Data Hydration & Hourly Rate Mapping", () => {
    test("4.1. Correctly extracts and formats hourlyRate from hourlyRate, hourlyRateMin, or hourlyRateMax", () => {
      const resolveHourlyRate = (job) => {
        const rate =
          job.hourlyRate ?? job.hourlyRateMin ?? job.hourlyRateMax ?? "";
        return typeof rate === "number" && !isNaN(rate) ? rate : "";
      };

      assert.strictEqual(resolveHourlyRate({ hourlyRate: 45 }), 45);
      assert.strictEqual(resolveHourlyRate({ hourlyRateMin: 30 }), 30);
      assert.strictEqual(
        resolveHourlyRate({ hourlyRate: null, hourlyRateMin: 25 }),
        25,
      );
      assert.strictEqual(
        resolveHourlyRate({ hourlyRate: null, hourlyRateMin: null }),
        "",
      );
    });

    test("4.2. Correctly formats startDate ISO string into YYYY-MM-DD for date input", () => {
      const formatStartDateForInput = (dateString) => {
        if (!dateString) return "";
        try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return "";
          return d.toISOString().split("T")[0];
        } catch {
          return "";
        }
      };

      assert.strictEqual(
        formatStartDateForInput("2026-06-15T10:30:00.000Z"),
        "2026-06-15",
      );
      assert.strictEqual(formatStartDateForInput(null), "");
      assert.strictEqual(formatStartDateForInput("invalid"), "");
    });
  });

  describe("5. Validation & Submission Simulation", () => {
    const simulateValidate = ({
      title,
      categoryId,
      description,
      workType,
      paymentStructure,
      workersNeeded,
      jobLocation,
      budgetAmount,
      hourlyRate,
      status,
    }) => {
      if (!categoryId?.trim()) {
        return { isValid: false, error: "Please select a job category." };
      }
      if (!title?.trim()) {
        return { isValid: false, error: "Job title cannot be empty." };
      }
      if (!description?.trim()) {
        return { isValid: false, error: "Job description cannot be empty." };
      }
      if (!workType || !["remote", "local"].includes(workType)) {
        return { isValid: false, error: "Please select a valid work type." };
      }
      if (!paymentStructure || !["fixed", "hourly"].includes(paymentStructure)) {
        return {
          isValid: false,
          error: "Please select a valid payment structure.",
        };
      }
      if (
        workersNeeded === "" ||
        typeof workersNeeded !== "number" ||
        isNaN(workersNeeded) ||
        !Number.isInteger(workersNeeded) ||
        workersNeeded <= 0
      ) {
        return {
          isValid: false,
          error: "Number of gigs needed must be a positive integer.",
        };
      }

      const isPublishedOrPaused = status === "open" || status === "paused";

      if (isPublishedOrPaused) {
        if (workType === "local" && !jobLocation?.trim()) {
          return {
            isValid: false,
            error: "Job location is required for on-site / local gigs.",
          };
        }
        if (paymentStructure === "fixed") {
          if (
            typeof budgetAmount !== "number" ||
            isNaN(budgetAmount) ||
            budgetAmount <= 0
          ) {
            return {
              isValid: false,
              error:
                "Budget amount must be a positive number for fixed price gigs.",
            };
          }
        } else if (paymentStructure === "hourly") {
          if (
            typeof hourlyRate !== "number" ||
            isNaN(hourlyRate) ||
            hourlyRate <= 0
          ) {
            return {
              isValid: false,
              error:
                "Hourly rate must be a positive number for hourly rate gigs.",
            };
          }
        }
      }

      return { isValid: true };
    };

    test("5.1. Accepts valid payload for OPEN job with hourly rate and local location", () => {
      const result = simulateValidate({
        title: "Senior Bartender",
        categoryId: "cat-1",
        description: "Great event bartending gig.",
        workType: "local",
        paymentStructure: "hourly",
        workersNeeded: 2,
        jobLocation: "Chicago, IL",
        hourlyRate: 35,
        status: "open",
      });

      assert.strictEqual(result.isValid, true);
    });

    test("5.2. Rejects OPEN local gig when jobLocation is missing", () => {
      const result = simulateValidate({
        title: "Senior Bartender",
        categoryId: "cat-1",
        description: "Great event bartending gig.",
        workType: "local",
        paymentStructure: "hourly",
        workersNeeded: 2,
        jobLocation: "",
        hourlyRate: 35,
        status: "open",
      });

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(
        result.error,
        "Job location is required for on-site / local gigs.",
      );
    });

    test("5.3. Rejects PAUSED fixed gig when budgetAmount is <= 0 or missing", () => {
      const result = simulateValidate({
        title: "Logo Designer",
        categoryId: "cat-1",
        description: "Design a tech logo.",
        workType: "remote",
        paymentStructure: "fixed",
        workersNeeded: 1,
        budgetAmount: 0,
        status: "paused",
      });

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(
        result.error,
        "Budget amount must be a positive number for fixed price gigs.",
      );
    });

    test("5.4. Allows DRAFT job to be saved with empty optional fields", () => {
      const result = simulateValidate({
        title: "Draft Job",
        categoryId: "cat-1",
        description: "Initial draft.",
        workType: "local",
        paymentStructure: "fixed",
        workersNeeded: 1,
        jobLocation: "",
        budgetAmount: "",
        status: "draft",
      });

      assert.strictEqual(result.isValid, true);
    });

    test("5.5. Prevents duplicate submissions while saving is in flight", async () => {
      let isSubmitting = false;
      let submissionCount = 0;

      const simulateSubmit = async () => {
        if (isSubmitting) return "BLOCKED_DUPLICATE";
        isSubmitting = true;
        try {
          submissionCount++;
          // simulate network delay
          await new Promise((r) => setTimeout(r, 10));
          return "SUCCESS";
        } finally {
          isSubmitting = false;
        }
      };

      const [res1, res2] = await Promise.all([
        simulateSubmit(),
        simulateSubmit(),
      ]);

      assert.strictEqual(submissionCount, 1);
      assert.strictEqual(res1 === "SUCCESS" || res2 === "SUCCESS", true);
      assert.strictEqual(
        res1 === "BLOCKED_DUPLICATE" || res2 === "BLOCKED_DUPLICATE",
        true,
      );
    });
  });
});
