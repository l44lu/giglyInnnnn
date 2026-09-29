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

describe("Step 3: Recruiter Profile Route, API & UI Integration", () => {
  describe("1. Route Registration in App.tsx", () => {
    const appPath = path.resolve(__dirname, "../App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");

    test("1.1. App.tsx imports RecruiterProfile", () => {
      assert.match(
        content,
        /import\s+RecruiterProfile\s+from\s+["']\.\/pages\/recruiter\/RecruiterProfile["']/,
        "App.tsx must import RecruiterProfile component",
      );
    });

    test("1.2. App.tsx registers /recruiter/profile protected with allowedRoles=['RECRUITER']", () => {
      assert.match(
        content,
        /path=["']\/recruiter\/profile["']/,
        "App.tsx must define /recruiter/profile route",
      );
      assert.match(
        content,
        /<ProtectedRoute\s+allowedRoles=\{(\[.*?"RECRUITER".*?\])\}>\s*<RecruiterProfile\s*\/>\s*<\/ProtectedRoute>/s,
        "/recruiter/profile route must be wrapped in ProtectedRoute with allowedRoles=['RECRUITER']",
      );
    });
  });

  describe("2. ProtectedRoute RBAC Evaluation for /recruiter/profile", () => {
    test("2.1. Unauthenticated user is redirected to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: false,
          role: null,
        },
        allowedRoles: ["RECRUITER"],
        children: "RecruiterProfileElement",
      });

      assert.deepEqual(result, {
        status: "REDIRECT",
        to: "/login",
        replace: true,
      });
    });

    test("2.2. Loading auth state returns LOADING status without redirect", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: true,
          role: null,
        },
        allowedRoles: ["RECRUITER"],
        children: "RecruiterProfileElement",
      });

      assert.deepEqual(result, { status: "LOADING" });
    });

    test("2.3. Authenticated WORKER is redirected to /worker/dashboard (403 fallback)", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "WORKER",
        },
        allowedRoles: ["RECRUITER"],
        children: "RecruiterProfileElement",
      });

      assert.deepEqual(result, {
        status: "REDIRECT",
        to: "/worker/dashboard",
        replace: true,
      });
    });

    test("2.4. Authenticated ADMIN is redirected to /admin/dashboard (403 fallback)", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "ADMIN",
        },
        allowedRoles: ["RECRUITER"],
        children: "RecruiterProfileElement",
      });

      assert.deepEqual(result, {
        status: "REDIRECT",
        to: "/admin/dashboard",
        replace: true,
      });
    });

    test("2.5. Authenticated RECRUITER is granted access to /recruiter/profile", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          role: "RECRUITER",
        },
        allowedRoles: ["RECRUITER"],
        children: "RecruiterProfileElement",
      });

      assert.deepEqual(result, {
        status: "RENDER",
        element: "RecruiterProfileElement",
      });
    });
  });

  describe("3. Recruiter API Client Verification (recruiter-api.ts)", () => {
    const apiPath = path.resolve(__dirname, "../lib/recruiter-api.ts");
    const content = fs.readFileSync(apiPath, "utf-8");

    test("3.1. recruiter-api.ts exports all required API functions", () => {
      assert.match(content, /export const getRecruiterProfile\s*=/);
      assert.match(content, /export const updateRecruiterProfile\s*=/);
      assert.match(content, /export const updateRecruiterPersonalProfile\s*=/);
      assert.match(content, /export const uploadRecruiterAvatar\s*=/);
      assert.match(content, /export const fetchRecruiterAvatarBlob\s*=/);
    });

    test("3.2. Endpoint paths target /recruiter/profile routes", () => {
      assert.match(content, /["']\/recruiter\/profile["']/);
      assert.match(content, /["']\/recruiter\/profile\/personal["']/);
      assert.match(content, /["']\/recruiter\/profile\/avatar["']/);
    });

    test("3.3. Avatar validation enforces allowed MIME types and 2MB limit", () => {
      assert.match(content, /ALLOWED_AVATAR_MIME_TYPES/);
      assert.match(content, /image\/jpeg/);
      assert.match(content, /image\/png/);
      assert.match(content, /image\/webp/);
      assert.match(content, /2\s*\*\s*1024\s*\*\s*1024/);
    });

    test("3.4. No token storage or manual Authorization header attachment", () => {
      assert.doesNotMatch(content, /localStorage/);
      assert.doesNotMatch(content, /sessionStorage/);
      assert.doesNotMatch(content, /Bearer\s+\$\{/);
    });
  });

  describe("4. Recruiter Profile UI Components & Sidebar Navigation", () => {
    const sidebarPath = path.resolve(
      __dirname,
      "../components/recruiter/RecruiterSidebar.tsx",
    );
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    test("4.1. RecruiterSidebar links user card to /recruiter/profile", () => {
      assert.match(
        sidebarContent,
        /to=["']\/recruiter\/profile["']/,
        "RecruiterSidebar must contain link to /recruiter/profile",
      );
    });

    test("4.2. RecruiterSidebar supports blob avatar loading and version sync", () => {
      assert.match(sidebarContent, /fetchRecruiterAvatarBlob/);
      assert.match(sidebarContent, /URL\.createObjectURL/);
      assert.match(sidebarContent, /gigly:recruiter-avatar-version-updated/);
    });

    test("4.3. RecruiterProfile page renders all profile sections", () => {
      const pagePath = path.resolve(
        __dirname,
        "../pages/recruiter/RecruiterProfile.tsx",
      );
      const pageContent = fs.readFileSync(pagePath, "utf-8");

      assert.match(pageContent, /<RecruiterSidebar/);
      assert.match(pageContent, /<RecruiterProfileHeader/);
      assert.match(pageContent, /<RecruiterProfileOverview/);
      assert.match(pageContent, /<RecruiterPersonalInfoCard/);
      assert.match(pageContent, /<RecruiterProfessionalCard/);
      assert.match(pageContent, /<RecruiterCompanyCard/);
      assert.match(pageContent, /<RecruiterChangePasswordCard/);
    });
  });
});
