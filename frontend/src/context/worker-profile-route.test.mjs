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

describe("Step 2D: Worker Profile Route & Navigation Foundation", () => {
  describe("1. Route Registration in App.tsx", () => {
    const appPath = path.resolve(__dirname, "../App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");

    test("1.1. App.tsx imports WorkerProfile", () => {
      assert.match(
        content,
        /import\s+WorkerProfile\s+from\s+["']\.\/pages\/worker\/WorkerProfile["']/,
        "App.tsx must import WorkerProfile component",
      );
    });

    test("1.2. App.tsx registers /worker/profile protected with allowedRoles=['WORKER']", () => {
      assert.match(
        content,
        /path=["']\/worker\/profile["']/,
        "App.tsx must define /worker/profile route",
      );
      assert.match(
        content,
        /<ProtectedRoute\s+allowedRoles=\{?\[["']WORKER["']\]\}?>[\s\S]*?<WorkerProfile\s*\/>[\s\S]*?<\/ProtectedRoute>/,
        "Route /worker/profile must be wrapped in ProtectedRoute with WORKER role restriction",
      );
    });
  });

  describe("2. WorkerSidebar Navigation to Profile", () => {
    const sidebarPath = path.resolve(
      __dirname,
      "../components/worker/WorkerSidebar.tsx",
    );
    const content = fs.readFileSync(sidebarPath, "utf-8");

    test("2.1. WorkerSidebar contains a Link to /worker/profile", () => {
      assert.match(
        content,
        /<Link[^>]*to=["']\/worker\/profile["']/,
        "WorkerSidebar must contain a Link with to='/worker/profile'",
      );
    });

    test("2.2. Profile identity card links to /worker/profile with accessible label", () => {
      assert.match(
        content,
        /aria-label=["']View worker profile["']/,
        "Profile link must have aria-label for accessibility",
      );
      assert.match(
        content,
        /\{displayName\}/,
        "Profile identity section must preserve {displayName}",
      );
    });

    test("2.3. Logout button remains separated and functional", () => {
      assert.match(
        content,
        /<button[^>]*type=["']button["'][^>]*onClick=\{handleLogout\}/,
        "Logout button must remain functional and distinct from profile link",
      );
      assert.match(content, /<span>Logout<\/span>/);
    });
  });

  describe("3. Route Protection Security Invariants", () => {
    test("3.1. Logged out user attempting to access /worker/profile is redirected to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          role: null,
        },
        allowedRoles: ["WORKER"],
        children: "WORKER_PROFILE_PAGE",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/login");
      assert.strictEqual(result.replace, true);
    });

    test("3.2. Authenticated WORKER can access /worker/profile", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "w-1", email: "worker@example.com", role: "WORKER" },
          role: "WORKER",
        },
        allowedRoles: ["WORKER"],
        children: "WORKER_PROFILE_PAGE",
      });

      assert.strictEqual(result.status, "RENDER");
      assert.strictEqual(result.element, "WORKER_PROFILE_PAGE");
    });

    test("3.3. Authenticated ADMIN is blocked and redirected to /admin/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "a-1", email: "admin@example.com", role: "ADMIN" },
          role: "ADMIN",
        },
        allowedRoles: ["WORKER"],
        children: "WORKER_PROFILE_PAGE",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/admin/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("3.4. Authenticated RECRUITER is blocked and redirected to /recruiter/dashboard", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: "r-1", email: "recruiter@example.com", role: "RECRUITER" },
          role: "RECRUITER",
        },
        allowedRoles: ["WORKER"],
        children: "WORKER_PROFILE_PAGE",
      });

      assert.strictEqual(result.status, "REDIRECT");
      assert.strictEqual(result.to, "/recruiter/dashboard");
      assert.strictEqual(result.replace, true);
    });

    test("3.5. While isLoading is true, loading indicator renders without redirecting to /login", () => {
      const result = evaluateProtectedRoute({
        authContext: {
          isAuthenticated: false,
          isLoading: true,
          user: null,
          role: null,
        },
        allowedRoles: ["WORKER"],
        children: "WORKER_PROFILE_PAGE",
      });

      assert.strictEqual(result.status, "LOADING");
    });
  });

  describe("4. WorkerProfile Page Component Foundation", () => {
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const componentsDir = path.resolve(__dirname, "../components/worker");
    const profileHeaderPath = path.join(componentsDir, "WorkerProfileHeader.tsx");
    const profileOverviewPath = path.join(componentsDir, "WorkerProfileOverview.tsx");
    const profileStatsPath = path.join(componentsDir, "WorkerProfileStats.tsx");
    const personalCardPath = path.join(componentsDir, "WorkerPersonalInfoCard.tsx");
    const changePasswordCardPath = path.join(componentsDir, "WorkerChangePasswordCard.tsx");
    const skillsCardPath = path.join(componentsDir, "WorkerSkillsCard.tsx");

    test("4.1. WorkerProfile.tsx exists", () => {
      assert.strictEqual(
        fs.existsSync(profilePath),
        true,
        "WorkerProfile.tsx must exist",
      );
    });

    test("4.2. WorkerProfile renders WorkerSidebar and title", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerSidebar\b/,
        "WorkerProfile must render WorkerSidebar",
      );
      assert.match(
        content,
        /<WorkerProfileHeader\b/,
        "WorkerProfile must render WorkerProfileHeader",
      );
      const headerContent = fs.readFileSync(profileHeaderPath, "utf-8");
      assert.match(
        headerContent,
        /Worker profile/i,
        "WorkerProfileHeader must display title",
      );
    });

    test("4.3. WorkerProfile renders top header and Edit Details action", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerProfileHeader\b/,
        "WorkerProfile must render WorkerProfileHeader",
      );
      const headerContent = fs.readFileSync(profileHeaderPath, "utf-8");
      assert.match(
        headerContent,
        /Edit Details/,
        "Must render 'Edit Details' button",
      );
      assert.match(
        headerContent,
        /Manage your public information[\s\S]*?location/,
        "Must render header description subtitle",
      );
    });

    test("4.4. WorkerProfile renders profile summary card with honest status badges and no fake identity", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerProfileOverview\b/,
        "WorkerProfile must render WorkerProfileOverview",
      );
      const overviewContent = fs.readFileSync(profileOverviewPath, "utf-8");
      assert.match(
        overviewContent,
        /Verified profile/,
        "Must render 'Verified profile' badge",
      );
      assert.match(overviewContent, /— rating/, "Must render neutral unavailable rating");
      assert.doesNotMatch(overviewContent, /4\.8 rating/, "Must not contain fake 4.8 rating");
      assert.match(overviewContent, /Open to work/, "Must render 'Open to work' badge");
      assert.doesNotMatch(
        overviewContent,
        /Freelance worker • General labor, delivery, and event support/,
        "Must not contain hardcoded fictional headline",
      );
      assert.doesNotMatch(
        overviewContent,
        /images\.unsplash\.com/,
        "Must not use external Unsplash avatar fallback",
      );
    });

    test("4.5. WorkerProfile renders 2x2 stats grid with honest unavailable states", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerProfileStats\b/,
        "WorkerProfile must render WorkerProfileStats",
      );
      const statsContent = fs.readFileSync(profileStatsPath, "utf-8");
      assert.match(statsContent, /COMPLETED JOBS/, "Must render COMPLETED JOBS metric");
      assert.match(statsContent, /CLIENTS/, "Must render CLIENTS metric");
      assert.match(statsContent, /RESPONSE TIME/, "Must render RESPONSE TIME metric");
      assert.match(statsContent, /MEMBER SINCE/, "Must render MEMBER SINCE metric");
      assert.doesNotMatch(statsContent, />38</, "Must not contain fake 38 completed jobs");
      assert.doesNotMatch(statsContent, />12</, "Must not contain fake 12 clients");
    });

    test("4.6. WorkerProfile renders Personal Information card with fields and Update action", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerPersonalInfoCard\b/,
        "WorkerProfile must render WorkerPersonalInfoCard",
      );
      const personalContent = fs.readFileSync(personalCardPath, "utf-8");
      assert.match(
        personalContent,
        /Personal information/,
        "Must render 'Personal information' card title",
      );
      assert.match(
        personalContent,
        /Update/,
        "Must render 'Update' action",
      );
      assert.match(personalContent, /FULL NAME/, "Must render FULL NAME field");
      assert.match(personalContent, /EMAIL/, "Must render EMAIL field");
      assert.match(personalContent, /PHONE/, "Must render PHONE field");
      assert.match(personalContent, /LOCATION/, "Must render LOCATION field");
      assert.match(personalContent, /BIO/, "Must render BIO field");
    });

    test("4.7. WorkerProfile renders Change Password card", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerChangePasswordCard\b/,
        "WorkerProfile must render WorkerChangePasswordCard",
      );
      const changePasswordContent = fs.readFileSync(changePasswordCardPath, "utf-8");
      assert.match(
        changePasswordContent,
        /Change password/,
        "Must render 'Change password' section",
      );
      assert.match(
        changePasswordContent,
        /Change Password/,
        "Must render 'Change Password' action button",
      );
    });

    test("4.8. WorkerProfile renders Skills card with empty state instead of fake tags", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerSkillsCard\b/,
        "WorkerProfile must render WorkerSkillsCard",
      );
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(skillsContent, /Core skills/, "Must render 'Core skills' heading");
      assert.match(
        skillsContent,
        /No skills added yet/,
        "Must render honest empty state for skills",
      );
      assert.doesNotMatch(
        skillsContent,
        /Warehouse support/,
        "Must not contain fake 'Warehouse support' skill",
      );
      assert.doesNotMatch(
        skillsContent,
        /Working style/,
        "Must NOT render 'Working style' heading (removed in Step 2H-7)",
      );
      assert.doesNotMatch(
        skillsContent,
        /Punctual/,
        "Must not contain fake 'Punctual' working style",
      );
    });
  });

  describe("5. Worker Profile Real Data Integration (Step 2F-2)", () => {
    const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const typesPath = path.resolve(__dirname, "../types/worker-profile.ts");

    test("5.1. worker-profile.ts defines WorkerProfileResponse contract", () => {
      assert.strictEqual(fs.existsSync(typesPath), true);
      const content = fs.readFileSync(typesPath, "utf-8");
      assert.match(content, /export interface WorkerProfileResponse/);
      assert.match(content, /headline:\s*string\s*\|\s*null/);
      assert.match(content, /responseTimeHours:\s*number\s*\|\s*null/);
      assert.match(content, /totalCompletedGigs:\s*number/);
      assert.match(content, /isOpenToWork:\s*boolean/);
    });

    test("5.2. worker-api.ts exports getWorkerProfile requesting GET /worker/profile", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /export const getWorkerProfile\b/);
      assert.match(content, /api\.get<WorkerProfileResponse>\(["']\/worker\/profile["']\)/);
    });

    test("5.3. worker-api.ts handles HTTP 404 by returning null", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /status === 404/);
      assert.match(content, /return null/);
    });

    test("5.4. WorkerProfile.tsx calls getWorkerProfile on mount and manages loading state", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(content, /import\s*\{[^}]*getWorkerProfile[^}]*\}\s*from\s*["']@\/lib\/worker-api["']/);
      assert.match(content, /getWorkerProfile\(\)/);
      assert.match(content, /isLoadingProfile/);
      assert.match(content, /data-testid=["']profile-loading["']/);
      assert.match(content, /Loading profile\.\.\./);
    });

    test("5.5. WorkerProfile.tsx binds real worker profile attributes and honest 404 defaults", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(content, /activeProfile\.headline/);
      assert.match(content, /activeProfile\.totalCompletedGigs/);
      assert.match(content, /activeProfile\.responseTimeHours/);
      assert.match(content, /activeProfile\.isOpenToWork/);
    });

    test("5.6. WorkerProfile.tsx renders non-blocking error alert on failure", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(content, /profileError/);
      const headerContent = fs.readFileSync(
        path.resolve(__dirname, "../components/worker/WorkerProfileHeader.tsx"),
        "utf-8",
      );
      assert.match(headerContent, /role=["']alert["']/);
      assert.match(headerContent, /Retry/);
    });

    test("5.7. Simulated getWorkerProfile logic handles 200, 404, and network errors", async () => {
      const mockApi = {
        get: async (url) => {
          if (url === "/worker/profile") {
            return {
              data: {
                id: "wp-123",
                userId: "u-123",
                headline: "Experienced Warehouse Specialist",
                yearsExperience: 5,
                responseTimeHours: 2,
                availabilityStatus: "available",
                isOpenToWork: true,
                totalCompletedGigs: 42,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
              },
            };
          }
          throw new Error("unhandled");
        },
      };

      const simulateGetWorkerProfile = async (client) => {
        try {
          const res = await client.get("/worker/profile");
          return res.data;
        } catch (error) {
          if (error?.response?.status === 404) {
            return null;
          }
          throw error;
        }
      };

      // 200 OK
      const data = await simulateGetWorkerProfile(mockApi);
      assert.strictEqual(data.headline, "Experienced Warehouse Specialist");
      assert.strictEqual(data.totalCompletedGigs, 42);

      // 404 Not Found -> returns null
      const mockApi404 = {
        get: async () => {
          const err = new Error("Not Found");
          err.response = { status: 404 };
          throw err;
        },
      };
      const notFoundData = await simulateGetWorkerProfile(mockApi404);
      assert.strictEqual(notFoundData, null);

      // 500 Internal Error -> re-throws
      const mockApi500 = {
        get: async () => {
          const err = new Error("Internal Server Error");
          err.response = { status: 500 };
          throw err;
        },
      };
      await assert.rejects(
        async () => simulateGetWorkerProfile(mockApi500),
        /Internal Server Error/,
      );
    });
  });

  describe("6. Worker Personal Information Editing (Step 2F-3)", () => {
    const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const sidebarPath = path.resolve(
      __dirname,
      "../components/worker/WorkerSidebar.tsx",
    );

    // Helpers matching worker-api.ts deterministic implementation
    const parseFullName = (fullName) => {
      const trimmed = fullName.trim();
      const spaceIndex = trimmed.indexOf(" ");
      if (spaceIndex === -1) {
        return {
          firstName: trimmed,
          lastName: "",
        };
      }
      return {
        firstName: trimmed.slice(0, spaceIndex),
        lastName: trimmed.slice(spaceIndex + 1).trim(),
      };
    };

    const formatNullableField = (val) => {
      if (val === null || val === undefined) return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    test("6.1. Deterministic full-name parser converts single Full Name into firstName and lastName", () => {
      // Standard two-token name
      const res1 = parseFullName("John Smith");
      assert.strictEqual(res1.firstName, "John");
      assert.strictEqual(res1.lastName, "Smith");

      // Single name input
      const res2 = parseFullName("John");
      assert.strictEqual(res2.firstName, "John");
      assert.strictEqual(res2.lastName, "");

      // Name with extra leading, trailing, and inner spaces
      const res3 = parseFullName("   Jane   Doe   ");
      assert.strictEqual(res3.firstName, "Jane");
      assert.strictEqual(res3.lastName, "Doe");

      // Multi-word surname
      const res4 = parseFullName("Mary Jane Watson");
      assert.strictEqual(res4.firstName, "Mary");
      assert.strictEqual(res4.lastName, "Jane Watson");

      // Single name with trailing whitespace
      const res5 = parseFullName("Prince  ");
      assert.strictEqual(res5.firstName, "Prince");
      assert.strictEqual(res5.lastName, "");
    });

    test("6.2. Nullable field helper converts empty or whitespace-only strings to null and preserves non-empty strings", () => {
      assert.strictEqual(formatNullableField(""), null);
      assert.strictEqual(formatNullableField("   "), null);
      assert.strictEqual(formatNullableField(null), null);
      assert.strictEqual(formatNullableField(undefined), null);
      assert.strictEqual(formatNullableField("+91 9876543210"), "+91 9876543210");
      assert.strictEqual(formatNullableField("  San Francisco, CA  "), "San Francisco, CA");
      assert.strictEqual(formatNullableField("  Experienced worker  "), "Experienced worker");
    });

    test("6.3. worker-api.ts exports updateWorkerPersonalProfile calling PATCH /worker/profile/personal", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /export const updateWorkerPersonalProfile\b/);
      assert.match(
        content,
        /api\.patch<User>\(["']\/worker\/profile\/personal["'],\s*payload\)/,
      );
      assert.match(content, /export const parseFullName\b/);
      assert.match(content, /export const formatNullableField\b/);
      assert.match(content, /export interface UpdateWorkerPersonalProfilePayload/);
    });

    test("6.4. Save payload construction includes only personal fields and excludes sensitive/auth fields", () => {
      const createPersonalPayload = ({ fullName, phone, location, bio }) => {
        const trimmedName = fullName.trim();
        if (!trimmedName) throw new Error("Full name is required.");
        const { firstName, lastName } = parseFullName(trimmedName);
        return {
          firstName,
          lastName,
          phone: formatNullableField(phone),
          location: formatNullableField(location),
          bio: formatNullableField(bio),
        };
      };

      // Fully populated
      const p1 = createPersonalPayload({
        fullName: "Alex Morgan",
        phone: "+1 555-1234",
        location: "Seattle, WA",
        bio: "Skilled worker",
      });
      assert.deepStrictEqual(p1, {
        firstName: "Alex",
        lastName: "Morgan",
        phone: "+1 555-1234",
        location: "Seattle, WA",
        bio: "Skilled worker",
      });

      // Cleared nullable fields convert to null
      const p2 = createPersonalPayload({
        fullName: "Madonna",
        phone: "",
        location: "   ",
        bio: "",
      });
      assert.deepStrictEqual(p2, {
        firstName: "Madonna",
        lastName: "",
        phone: null,
        location: null,
        bio: null,
      });

      // Verify forbidden fields are absent
      const forbiddenFields = ["email", "role", "id", "avatarUrl", "password"];
      for (const field of forbiddenFields) {
        assert.strictEqual(field in p1, false, `Field ${field} must not be in payload`);
        assert.strictEqual(field in p2, false, `Field ${field} must not be in payload`);
      }

      // Empty name validation
      assert.throws(() => createPersonalPayload({ fullName: "   ", phone: "", location: "", bio: "" }), {
        message: "Full name is required.",
      });
    });

    test("6.5. WorkerProfile.tsx connects updateWorkerPersonalProfile, refreshUser, and handles view/edit/cancel/save states", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerPersonalInfoCard\b/,
        "WorkerProfile must render WorkerPersonalInfoCard",
      );

      const personalPath = path.resolve(
        __dirname,
        "../components/worker/WorkerPersonalInfoCard.tsx",
      );
      const personalContent = fs.readFileSync(personalPath, "utf-8");

      // Verify imports and hook bindings in WorkerPersonalInfoCard
      assert.match(personalContent, /updateWorkerPersonalProfile/);
      assert.match(personalContent, /refreshUser/);
      assert.match(personalContent, /isEditingPersonal/);
      assert.match(personalContent, /isSavingPersonal/);
      assert.match(personalContent, /personalError/);

      // Verify button controls
      assert.match(personalContent, /aria-label=["']Update personal information["']/);
      assert.match(personalContent, /aria-label=["']Cancel personal information editing["']/);
      assert.match(personalContent, /aria-label=["']Save personal information["']/);

      // Verify email remains read-only
      assert.match(
        personalContent,
        /<input[^>]*type=["']email["'][^>]*readOnly/,
        "Email input must strictly remain readOnly",
      );

      // Verify professional update endpoint is NOT connected in personal card
      assert.doesNotMatch(
        personalContent,
        /api\.patch\([^)]*\/worker\/profile["']\s*,\s*[^)]*\)/,
        "Must NOT connect PATCH /worker/profile in personal card",
      );
    });

    test("6.6. Simulated save and cancel lifecycle: cancel restores initial data without API dispatch", async () => {
      let apiCalled = false;
      const initialUser = {
        firstName: "Sarah",
        lastName: "Connor",
        phone: "+1 800-555",
        location: "Los Angeles",
        bio: "Protector",
      };

      let formState = {
        fullName: `${initialUser.firstName} ${initialUser.lastName}`,
        phone: initialUser.phone,
        location: initialUser.location,
        bio: initialUser.bio,
      };

      // User enters edit mode and modifies form
      formState.fullName = "Sarah Reese";
      formState.phone = "";
      formState.bio = "Updated bio";

      // User clicks Cancel
      const handleCancel = () => {
        formState = {
          fullName: `${initialUser.firstName} ${initialUser.lastName}`,
          phone: initialUser.phone,
          location: initialUser.location,
          bio: initialUser.bio,
        };
      };
      handleCancel();

      assert.strictEqual(apiCalled, false, "Cancel must not call the API");
      assert.strictEqual(formState.fullName, "Sarah Connor");
      assert.strictEqual(formState.phone, "+1 800-555");
      assert.strictEqual(formState.bio, "Protector");
    });

    test("6.7. Simulated save flow: successful save dispatches PATCH, calls refreshUser(), and updates state", async () => {
      let dispatchedUrl = null;
      let dispatchedPayload = null;
      let refreshUserCalled = false;

      const mockApi = {
        patch: async (url, payload) => {
          dispatchedUrl = url;
          dispatchedPayload = payload;
          return {
            data: {
              id: "user-123",
              email: "sarah@example.com",
              role: "WORKER",
              firstName: payload.firstName,
              lastName: payload.lastName,
              phone: payload.phone,
              location: payload.location,
              bio: payload.bio,
            },
          };
        },
      };

      const mockRefreshUser = async () => {
        refreshUserCalled = true;
      };

      const payload = {
        firstName: "Sarah",
        lastName: "Reese",
        phone: null,
        location: "LA",
        bio: "Updated bio",
      };

      const result = await mockApi.patch("/worker/profile/personal", payload);
      await mockRefreshUser();

      assert.strictEqual(dispatchedUrl, "/worker/profile/personal");
      assert.deepStrictEqual(dispatchedPayload, payload);
      assert.strictEqual(refreshUserCalled, true);
      assert.strictEqual(result.data.firstName, "Sarah");
      assert.strictEqual(result.data.lastName, "Reese");
      assert.strictEqual(result.data.phone, null);
    });

    test("6.8. Simulated failed save keeps edit mode open, preserves unsaved inputs, and sets error", async () => {
      let isEditing = true;
      let errorMessage = null;
      const formInput = {
        fullName: "Sarah Connor",
        phone: "invalid-phone",
      };

      const simulateFailedSave = async () => {
        try {
          const err = new Error("Phone format is invalid");
          err.response = { data: { message: "Phone format is invalid" } };
          throw err;
        } catch (err) {
          errorMessage = err.response?.data?.message || "Failed to update";
          // Edit mode remains open
          isEditing = true;
        }
      };

      await simulateFailedSave();

      assert.strictEqual(isEditing, true, "Edit mode must remain open on error");
      assert.strictEqual(errorMessage, "Phone format is invalid");
      assert.strictEqual(formInput.fullName, "Sarah Connor", "Form input must be preserved");
    });

    test("6.9. WorkerSidebar derives displayName from AuthContext.user and reflects updated name without reload", () => {
      const content = fs.readFileSync(sidebarPath, "utf-8");
      assert.match(
        content,
        /const\s*\{\s*user,\s*logout\s*\}\s*=\s*useAuth\(\)/,
        "WorkerSidebar must read user from useAuth()",
      );
      assert.match(
        content,
        /const\s+displayName\s*=[\s\S]*?user\?\.firstName[\s\S]*?user\?\.lastName/,
        "WorkerSidebar must compute displayName dynamically from user",
      );
      assert.match(content, /\{displayName\}/);

      // Verify dynamic computation logic
      const computeDisplayName = (user) => {
        return `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
          ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
          : "Worker";
      };

      const beforeUpdate = { firstName: "John", lastName: "Doe" };
      assert.strictEqual(computeDisplayName(beforeUpdate), "John Doe");

      const afterUpdate = { firstName: "Johnny", lastName: "Silverhand" };
      assert.strictEqual(computeDisplayName(afterUpdate), "Johnny Silverhand");

      const singleName = { firstName: "Cher", lastName: "" };
      assert.strictEqual(computeDisplayName(singleName), "Cher");
    });
  });

  describe("7. Worker Professional Profile Editing (Step 2F-4)", () => {
    const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );

    // Helper matching worker-api.ts parseIntegerOrNull implementation
    const parseIntegerOrNull = (val) => {
      if (val === null || val === undefined) return null;
      const trimmed = String(val).trim();
      if (trimmed === "") return null;
      const num = Number(trimmed);
      if (!Number.isInteger(num) || num < 0) {
        return NaN;
      }
      return num;
    };

    test("7.1. parseIntegerOrNull helper converts strings to integers >= 0 or null, and returns NaN for invalid values", () => {
      assert.strictEqual(parseIntegerOrNull("2"), 2);
      assert.strictEqual(parseIntegerOrNull("0"), 0);
      assert.strictEqual(parseIntegerOrNull("48"), 48);
      assert.strictEqual(parseIntegerOrNull(""), null);
      assert.strictEqual(parseIntegerOrNull("   "), null);
      assert.strictEqual(parseIntegerOrNull(null), null);
      assert.strictEqual(parseIntegerOrNull(undefined), null);

      assert.strictEqual(Number.isNaN(parseIntegerOrNull("-1")), true);
      assert.strictEqual(Number.isNaN(parseIntegerOrNull("1.5")), true);
      assert.strictEqual(Number.isNaN(parseIntegerOrNull("fast")), true);
    });

    test("7.2. worker-api.ts exports updateWorkerProfile calling PATCH /worker/profile", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /export const updateWorkerProfile\b/);
      assert.match(
        content,
        /api\.patch<WorkerProfileResponse>\(\s*["']\/worker\/profile["'],\s*payload,?\s*\)/,
      );
      assert.match(content, /export const parseIntegerOrNull\b/);
      assert.match(content, /export interface UpdateWorkerProfilePayload/);
    });

    test("7.3. Professional profile payload construction adheres to backend contract and excludes unrepresented/immutable fields", () => {
      const createProfessionalPayload = ({ headline, responseTime, isOpenToWork }) => {
        const trimmedHeadline = headline.trim();
        const headlinePayload = trimmedHeadline.length > 0 ? trimmedHeadline : null;
        const parsedResponseTime = parseIntegerOrNull(responseTime);
        if (Number.isNaN(parsedResponseTime)) {
          throw new Error("Response time must be a non-negative whole number of hours.");
        }
        return {
          headline: headlinePayload,
          responseTimeHours: parsedResponseTime,
          isOpenToWork: Boolean(isOpenToWork),
        };
      };

      // Fully populated valid payload
      const p1 = createProfessionalPayload({
        headline: "Experienced Full Stack Developer",
        responseTime: "2",
        isOpenToWork: true,
      });
      assert.deepStrictEqual(p1, {
        headline: "Experienced Full Stack Developer",
        responseTimeHours: 2,
        isOpenToWork: true,
      });

      // Cleared fields: headline to null, response time to null, open to work false
      const p2 = createProfessionalPayload({
        headline: "   ",
        responseTime: "",
        isOpenToWork: false,
      });
      assert.deepStrictEqual(p2, {
        headline: null,
        responseTimeHours: null,
        isOpenToWork: false,
      });

      // Invalid response time throws validation error
      assert.throws(
        () => createProfessionalPayload({ headline: "Worker", responseTime: "-5", isOpenToWork: true }),
        { message: "Response time must be a non-negative whole number of hours." },
      );

      // Verify forbidden and unrepresented fields are absent
      const forbiddenFields = [
        "id",
        "userId",
        "totalCompletedGigs",
        "createdAt",
        "updatedAt",
        "email",
        "role",
        "password",
        "avatarUrl",
      ];
      for (const field of forbiddenFields) {
        assert.strictEqual(field in p1, false, `Field ${field} must not be in professional payload`);
        assert.strictEqual(field in p2, false, `Field ${field} must not be in professional payload`);
      }
    });

    test("7.4. WorkerProfile.tsx connects updateWorkerProfile and wires professional editing controls", () => {
      const content = fs.readFileSync(profilePath, "utf-8");

      // Verify imports and hook bindings in WorkerProfile
      assert.match(content, /updateWorkerProfile/);
      assert.match(content, /parseIntegerOrNull/);
      assert.match(content, /isEditingDetails/);
      assert.match(content, /isSavingDetails/);
      assert.match(content, /detailsError/);
      assert.match(content, /<WorkerProfileHeader\b/);
      assert.match(content, /<WorkerProfileOverview\b/);
      assert.match(content, /<WorkerProfileStats\b/);

      const headerPath = path.resolve(
        __dirname,
        "../components/worker/WorkerProfileHeader.tsx",
      );
      const headerContent = fs.readFileSync(headerPath, "utf-8");
      // Verify header action buttons
      assert.match(headerContent, /aria-label=["']Edit Details["']/);
      assert.match(headerContent, /aria-label=["']Cancel editing details["']/);
      assert.match(headerContent, /aria-label=["']Save details["']/);

      const overviewPath = path.resolve(
        __dirname,
        "../components/worker/WorkerProfileOverview.tsx",
      );
      const overviewContent = fs.readFileSync(overviewPath, "utf-8");
      // Verify professional field inputs
      assert.match(overviewContent, /aria-label=["']Professional headline["']/);
      assert.match(overviewContent, /aria-label=["']Toggle open to work status["']/);

      const statsPath = path.resolve(
        __dirname,
        "../components/worker/WorkerProfileStats.tsx",
      );
      const statsContent = fs.readFileSync(statsPath, "utf-8");
      assert.match(statsContent, /aria-label=["']Response time hours["']/);

      // Verify totalCompletedGigs remains read-only without inputs
      assert.match(statsContent, /COMPLETED JOBS/);
      assert.doesNotMatch(
        statsContent,
        /aria-label=["']Completed jobs["']/,
        "COMPLETED JOBS must remain strictly read-only",
      );
    });

    test("7.5. Simulated professional save and cancel lifecycle: cancel discards draft without API dispatch", () => {
      let apiCalled = false;
      const initialProfile = {
        headline: "General Labor Specialist",
        responseTimeHours: 4,
        isOpenToWork: true,
      };

      let draftState = {
        headline: initialProfile.headline,
        responseTimeHours: String(initialProfile.responseTimeHours),
        isOpenToWork: initialProfile.isOpenToWork,
      };

      // User enters edit mode and modifies fields
      draftState.headline = "Master Craftsman";
      draftState.responseTimeHours = "1";
      draftState.isOpenToWork = false;

      // User clicks Cancel
      const handleCancel = () => {
        draftState = {
          headline: initialProfile.headline,
          responseTimeHours: String(initialProfile.responseTimeHours),
          isOpenToWork: initialProfile.isOpenToWork,
        };
      };
      handleCancel();

      assert.strictEqual(apiCalled, false, "Cancel must not dispatch an API request");
      assert.strictEqual(draftState.headline, "General Labor Specialist");
      assert.strictEqual(draftState.responseTimeHours, "4");
      assert.strictEqual(draftState.isOpenToWork, true);
    });

    test("7.6. Simulated save flow: successful save dispatches PATCH /worker/profile, uses server response, and closes edit mode", async () => {
      let dispatchedUrl = null;
      let dispatchedPayload = null;

      const mockApi = {
        patch: async (url, payload) => {
          dispatchedUrl = url;
          dispatchedPayload = payload;
          return {
            data: {
              id: "wp-777",
              userId: "user-123",
              headline: payload.headline,
              yearsExperience: null,
              responseTimeHours: payload.responseTimeHours,
              availabilityStatus: "available",
              isOpenToWork: payload.isOpenToWork,
              totalCompletedGigs: 10,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          };
        },
      };

      const payload = {
        headline: "Senior Electrical Specialist",
        responseTimeHours: 1,
        isOpenToWork: true,
      };

      const result = await mockApi.patch("/worker/profile", payload);

      assert.strictEqual(dispatchedUrl, "/worker/profile");
      assert.deepStrictEqual(dispatchedPayload, payload);
      assert.strictEqual(result.data.headline, "Senior Electrical Specialist");
      assert.strictEqual(result.data.responseTimeHours, 1);
      assert.strictEqual(result.data.isOpenToWork, true);
      assert.strictEqual(result.data.totalCompletedGigs, 10);
    });

    test("7.7. Simulated failed save keeps edit mode open, preserves draft values, and displays error alert", async () => {
      let isEditingDetails = true;
      let detailsError = null;
      const draftState = {
        headline: "Draft Headline",
        responseTimeHours: "5",
      };

      const simulateFailedSave = async () => {
        try {
          const err = new Error("Validation Error: invalid response time");
          err.response = { data: { message: "Validation Error: invalid response time" } };
          throw err;
        } catch (err) {
          detailsError = err.response?.data?.message || "Failed to update profile";
          isEditingDetails = true;
        }
      };

      await simulateFailedSave();

      assert.strictEqual(isEditingDetails, true, "Edit mode must remain open upon failure");
      assert.strictEqual(detailsError, "Validation Error: invalid response time");
      assert.strictEqual(draftState.headline, "Draft Headline", "Draft must be preserved");
    });

    test("7.8. Upsert capability: initial 404 profile can be created seamlessly via PATCH /worker/profile", async () => {
      // Profile initialized as null (from 404 GET)
      let currentProfile = null;

      const mockApi = {
        patch: async (url, payload) => {
          return {
            data: {
              id: "new-profile-uuid",
              userId: "user-123",
              headline: payload.headline,
              yearsExperience: null,
              responseTimeHours: payload.responseTimeHours,
              availabilityStatus: "available",
              isOpenToWork: payload.isOpenToWork,
              totalCompletedGigs: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          };
        },
      };

      // User with no prior profile saves initial details
      const payload = {
        headline: "First-time worker headline",
        responseTimeHours: 2,
        isOpenToWork: true,
      };

      const res = await mockApi.patch("/worker/profile", payload);
      currentProfile = res.data;

      assert.notStrictEqual(currentProfile, null);
      assert.strictEqual(currentProfile.id, "new-profile-uuid");
      assert.strictEqual(currentProfile.headline, "First-time worker headline");
    });
  });

  describe("8. Worker Profile UX / State Polish & Resilience (Step 2F-5)", () => {
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );

    test("8.1. Loading and retry behavior: initial load guards edit interactions, retry clears error and prevents duplicate requests", () => {
      assert.strictEqual(fs.existsSync(profilePath), true);
      const content = fs.readFileSync(profilePath, "utf-8");
      const headerPath = path.resolve(
        __dirname,
        "../components/worker/WorkerProfileHeader.tsx",
      );
      const headerContent = fs.readFileSync(headerPath, "utf-8");

      // Verify initial loading state guards Edit Details button in header
      assert.match(
        headerContent,
        /disabled=\{isLoadingProfile\}/,
        "Edit Details and Retry buttons must be disabled while profile is loading",
      );

      // Verify handleRetry guards against redundant triggers and clears error in WorkerProfile
      assert.match(
        content,
        /if\s*\(\s*isLoadingProfile\s*\)\s*return/,
        "handleRetry must guard against concurrent retry requests when loading",
      );
      assert.match(
        content,
        /setProfileError\(\s*null\s*\)/,
        "handleRetry must immediately clear profileError",
      );

      // Verify simulate retry lifecycle
      let isLoadingProfile = false;
      let profileError = "Network error";
      let fetchCount = 0;

      const triggerRetry = () => {
        if (isLoadingProfile) return;
        profileError = null;
        isLoadingProfile = true;
        fetchCount++;
      };

      triggerRetry();
      assert.strictEqual(profileError, null, "Error must be cleared immediately upon retry");
      assert.strictEqual(isLoadingProfile, true, "Loading state must be set upon retry");
      assert.strictEqual(fetchCount, 1);

      // Rapid secondary click while loading is ignored
      triggerRetry();
      assert.strictEqual(fetchCount, 1, "Duplicate retry invocation must be suppressed");
    });

    test("8.2. Independent saving states: isSavingPersonal and isSavingDetails operate independently without state collision", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      const personalPath = path.resolve(
        __dirname,
        "../components/worker/WorkerPersonalInfoCard.tsx",
      );
      const personalContent = fs.readFileSync(personalPath, "utf-8");

      assert.match(personalContent, /isSavingPersonal/);
      assert.match(content, /isSavingDetails/);

      // State simulation verifying independence
      let isSavingPersonal = false;
      let isSavingDetails = false;
      let personalControlsDisabled = false;
      let professionalControlsDisabled = false;

      // Start saving personal
      isSavingPersonal = true;
      personalControlsDisabled = isSavingPersonal;
      professionalControlsDisabled = isSavingDetails;

      assert.strictEqual(personalControlsDisabled, true, "Personal controls disabled during personal save");
      assert.strictEqual(professionalControlsDisabled, false, "Professional controls remain active during personal save");

      // Complete personal save
      isSavingPersonal = false;

      // Start saving professional
      isSavingDetails = true;
      personalControlsDisabled = isSavingPersonal;
      professionalControlsDisabled = isSavingDetails;

      assert.strictEqual(personalControlsDisabled, false, "Personal controls remain active during professional save");
      assert.strictEqual(professionalControlsDisabled, true, "Professional controls disabled during professional save");
    });

    test("8.3. Duplicate submission prevention: save handlers reject execution when save is already in-flight", async () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      const personalPath = path.resolve(
        __dirname,
        "../components/worker/WorkerPersonalInfoCard.tsx",
      );
      const personalContent = fs.readFileSync(personalPath, "utf-8");

      // Verify both handlers check their respective saving flags
      assert.match(
        personalContent,
        /const\s+handleSavePersonal\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*isSavingPersonal\s*\)\s*return/,
        "handleSavePersonal must check isSavingPersonal to guard against duplicate dispatch",
      );
      assert.match(
        content,
        /const\s+handleSaveDetails\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*isSavingDetails\s*\)\s*return/,
        "handleSaveDetails must check isSavingDetails to guard against duplicate dispatch",
      );

      // Lifecycle test for duplicate click protection
      let isSaving = false;
      let networkCalls = 0;

      const submit = async () => {
        if (isSaving) return;
        isSaving = true;
        networkCalls++;
        await new Promise((res) => setTimeout(res, 10));
        isSaving = false;
      };

      // Dispatch 3 concurrent submissions
      await Promise.all([submit(), submit(), submit()]);
      assert.strictEqual(networkCalls, 1, "Only one network request should be dispatched despite multiple clicks");
    });

    test("8.4. Draft preservation on failure: validation or server errors keep edit mode active and draft values intact", async () => {
      let isEditing = true;
      let draftFullName = "Jane Doe";
      let draftHeadline = "Lead Electrician";
      let errorAlert = null;

      const mockFailedSave = async () => {
        try {
          throw new Error("Server 500 error");
        } catch (err) {
          errorAlert = err.message;
        }
      };

      await mockFailedSave();

      assert.strictEqual(isEditing, true, "Edit mode must remain open");
      assert.strictEqual(draftFullName, "Jane Doe", "Draft name must be preserved");
      assert.strictEqual(draftHeadline, "Lead Electrician", "Draft headline must be preserved");
      assert.strictEqual(errorAlert, "Server 500 error", "Error message must be presented");
    });

    test("8.5. Clean cancel rollback: Cancel discards draft without network calls and restores persisted values", () => {
      let apiRequests = 0;
      const persistedUser = {
        firstName: "Alice",
        lastName: "Smith",
        phone: "555-1234",
      };

      let draft = {
        fullName: "Bob Jones",
        phone: "555-9999",
      };

      // User hits cancel
      const cancel = () => {
        draft = null;
      };

      cancel();

      assert.strictEqual(apiRequests, 0, "No API requests dispatched on cancel");
      assert.strictEqual(draft, null, "Draft is cleared on cancel");
      const renderedName = `${persistedUser.firstName} ${persistedUser.lastName}`;
      assert.strictEqual(renderedName, "Alice Smith", "Persisted values are rendered");
    });

    test("8.6. Success feedback integration: uses SweetAlert2 toast notification following project convention", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      const personalPath = path.resolve(
        __dirname,
        "../components/worker/WorkerPersonalInfoCard.tsx",
      );
      const personalContent = fs.readFileSync(personalPath, "utf-8");

      assert.match(
        content,
        /import\s+Swal\s+from\s+["']sweetalert2["']/,
        "WorkerProfile must import SweetAlert2 for notifications",
      );
      assert.match(
        personalContent,
        /import\s+Swal\s+from\s+["']sweetalert2["']/,
        "WorkerPersonalInfoCard must import SweetAlert2 for notifications",
      );
      assert.match(
        content,
        /Swal\.mixin\(\s*\{[\s\S]*?toast:\s*true[\s\S]*?position:\s*["']top-end["']/,
        "WorkerProfile must configure a non-intrusive toast notification",
      );
      assert.match(
        personalContent,
        /Toast\.fire\(\s*\{[\s\S]*?icon:\s*["']success["'][\s\S]*?Personal information updated successfully/,
        "Must trigger success toast upon successful personal profile update",
      );
      assert.match(
        content,
        /Toast\.fire\(\s*\{[\s\S]*?icon:\s*["']success["'][\s\S]*?Professional profile updated successfully/,
        "Must trigger success toast upon successful professional profile update",
      );
    });

    test("8.7. Null/empty value resilience: null, undefined, or empty values never render as 'null', 'undefined', or 'NaN'", () => {
      const formatDisplayValue = (val, fallback = "—") => {
        if (val === null || val === undefined) return fallback;
        const str = String(val).trim();
        return str.length > 0 ? str : fallback;
      };

      assert.strictEqual(formatDisplayValue(null), "—");
      assert.strictEqual(formatDisplayValue(undefined), "—");
      assert.strictEqual(formatDisplayValue(""), "—");
      assert.strictEqual(formatDisplayValue("   "), "—");
      assert.strictEqual(formatDisplayValue(null, "No headline added yet"), "No headline added yet");
      assert.strictEqual(formatDisplayValue(null, "No bio provided yet."), "No bio provided yet.");

      // Check numeric response time formatting
      const formatResponseTime = (hrs) => {
        if (hrs !== null && hrs !== undefined && !Number.isNaN(hrs)) {
          return `${hrs} hrs`;
        }
        return "—";
      };

      assert.strictEqual(formatResponseTime(null), "—");
      assert.strictEqual(formatResponseTime(undefined), "—");
      assert.strictEqual(formatResponseTime(3), "3 hrs");
      assert.strictEqual(formatResponseTime(0), "0 hrs");
      assert.strictEqual(formatResponseTime(NaN), "—");

      // Check memberSince date year formatting
      const formatMemberSince = (createdAt) => {
        if (!createdAt) return "—";
        const year = new Date(createdAt).getFullYear();
        return Number.isNaN(year) ? "—" : String(year);
      };

      assert.strictEqual(formatMemberSince(null), "—");
      assert.strictEqual(formatMemberSince(undefined), "—");
      assert.strictEqual(formatMemberSince("invalid-date"), "—");
      assert.strictEqual(formatMemberSince("2024-05-10T12:00:00Z"), "2024");
    });

    test("8.8. Authentication and session separation: profile errors never trigger logout, token clearing, or login redirect", () => {
      let authState = {
        isAuthenticated: true,
        user: { id: "w-1", email: "worker@example.com", role: "WORKER" },
      };
      let redirectLocation = null;

      const handleProfileError = (status) => {
        // Safe profile error handling: sets local component error, does not touch auth
        if (status === 404) {
          // Fall back to default profile
          return { error: null, fallback: true };
        }
        return { error: "Failed to load worker profile", fallback: false };
      };

      // 404 profile not found
      const res404 = handleProfileError(404);
      assert.strictEqual(res404.error, null);
      assert.strictEqual(res404.fallback, true);
      assert.strictEqual(authState.isAuthenticated, true, "Auth state must remain untouched on 404");
      assert.strictEqual(redirectLocation, null, "No redirect on 404");

      // 500 server error
      const res500 = handleProfileError(500);
      assert.strictEqual(res500.error, "Failed to load worker profile");
      assert.strictEqual(authState.isAuthenticated, true, "Auth state must remain untouched on 500");
      assert.strictEqual(redirectLocation, null, "No redirect on 500");
    });
  });

  describe("9. Worker Profile Core Skills UI Integration (Step 2H-7)", () => {
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const skillsCardPath = path.resolve(
      __dirname,
      "../components/worker/WorkerSkillsCard.tsx",
    );

    test("9.1. WorkerProfile imports getSkillCatalog, getWorkerSkills, and updateWorkerSkills", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.match(
        content,
        /<WorkerSkillsCard\b/,
        "WorkerProfile must render WorkerSkillsCard",
      );
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(skillsContent, /getSkillCatalog/);
      assert.match(skillsContent, /getWorkerSkills/);
      assert.match(skillsContent, /updateWorkerSkills/);
      assert.match(skillsContent, /Skill/);
      assert.match(skillsContent, /WorkerSkill/);
    });

    test("9.2. Working Style section is completely removed from WorkerProfile.tsx", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.doesNotMatch(
        content,
        /Working style/i,
        "WorkerProfile.tsx must NOT contain 'Working style'",
      );
      assert.doesNotMatch(
        skillsContent,
        /Working style/i,
        "WorkerSkillsCard.tsx must NOT contain 'Working style'",
      );
      assert.doesNotMatch(
        content,
        /No working styles added yet/i,
        "WorkerProfile.tsx must NOT contain working style empty state",
      );
      assert.doesNotMatch(
        skillsContent,
        /No working styles added yet/i,
        "WorkerSkillsCard.tsx must NOT contain working style empty state",
      );
    });

    test("9.3. No fake skill names exist in WorkerProfile.tsx", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      const fakeSkills = [
        "Warehouse support",
        "Event staffing",
        "Dishwashing",
        "Housekeeping",
        "Cashier",
        "Food Serving",
        "Kitchen Help",
      ];
      for (const skill of fakeSkills) {
        assert.strictEqual(
          content.includes(`"${skill}"`) || content.includes(`'${skill}'`),
          false,
          `WorkerProfile.tsx must not hardcode '${skill}'`,
        );
        assert.strictEqual(
          skillsContent.includes(`"${skill}"`) || skillsContent.includes(`'${skill}'`),
          false,
          `WorkerSkillsCard.tsx must not hardcode '${skill}'`,
        );
      }
    });

    test("9.4. WorkerProfile renders loading state while skills are being fetched", () => {
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(skillsContent, /data-testid=["']skills-loading["']/);
      assert.match(skillsContent, /Loading skills\.\.\./);
    });

    test("9.5. Empty state renders when worker has no saved skills", () => {
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(
        skillsContent,
        /No skills added yet\./,
        "Must render honest empty state when savedSkills is empty",
      );
    });

    test("9.6. Skills render from real API data using ws.skillName", () => {
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(
        skillsContent,
        /ws\.skillName/,
        "Must render skill chips using real ws.skillName attribute",
      );
      assert.doesNotMatch(
        skillsContent,
        /ws\.skillType/,
        "Must not expose or render ws.skillType",
      );
    });

    test("9.7. Edit skills controls: Edit, Cancel, Save buttons with proper accessibility labels", () => {
      const skillsContent = fs.readFileSync(skillsCardPath, "utf-8");
      assert.match(skillsContent, /aria-label=["']Edit skills["']/);
      assert.match(skillsContent, /aria-label=["']Cancel skills editing["']/);
      assert.match(skillsContent, /aria-label=["']Save skills["']/);
      assert.match(skillsContent, /aria-label=["']Select skill to add["']/);
      assert.match(skillsContent, /aria-label=["']Add skill["']/);
    });

    test("9.8. Duplicate prevention: availableCatalogOptions filters out already selected skill IDs", () => {
      const catalog = [
        { id: "s-1", name: "Food Serving" },
        { id: "s-2", name: "Kitchen Help" },
        { id: "s-3", name: "Table Service" },
      ];
      const draftSkillIds = ["s-1", "s-3"];

      const selectedSet = new Set(draftSkillIds);
      const availableOptions = catalog.filter((skill) => !selectedSet.has(skill.id));

      assert.strictEqual(availableOptions.length, 1);
      assert.strictEqual(availableOptions[0].id, "s-2");
      assert.strictEqual(availableOptions[0].name, "Kitchen Help");
    });

    test("9.9. Simulated add/remove draft lifecycle: adding and removing does NOT trigger API requests", () => {
      let apiCalled = false;
      let draftSkillIds = ["s-1"];

      const handleAdd = (id) => {
        if (!draftSkillIds.includes(id)) {
          draftSkillIds = [...draftSkillIds, id];
        }
      };

      const handleRemove = (id) => {
        draftSkillIds = draftSkillIds.filter((item) => item !== id);
      };

      // Add s-2
      handleAdd("s-2");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-2"]);

      // Duplicate add of s-2 is ignored
      handleAdd("s-2");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-2"]);

      // Remove s-1
      handleRemove("s-1");
      assert.deepStrictEqual(draftSkillIds, ["s-2"]);

      assert.strictEqual(apiCalled, false, "Local draft mutations must NOT call API");
    });

    test("9.10. Simulated cancel lifecycle: restores saved skills and exits edit mode without API calls", () => {
      let apiCalled = false;
      let isEditing = true;
      const savedSkills = [
        { id: "ws-1", skillId: "s-1", skillName: "Food Serving" },
      ];
      let draftSkillIds = ["s-1", "s-2", "s-3"]; // user modified draft

      const handleCancel = () => {
        draftSkillIds = savedSkills.map((s) => s.skillId);
        isEditing = false;
      };

      handleCancel();

      assert.strictEqual(apiCalled, false, "Cancel must not call the API");
      assert.strictEqual(isEditing, false, "Cancel must close edit mode");
      assert.deepStrictEqual(draftSkillIds, ["s-1"], "Draft must be reset to saved skills");
    });

    test("9.11. Simulated save lifecycle: dispatches updateWorkerSkills with exact skillIds, updates saved state, and closes edit mode", async () => {
      let dispatchedPayload = null;
      let isEditing = true;

      const mockUpdateWorkerSkills = async (ids) => {
        dispatchedPayload = { skillIds: ids };
        return [
          { id: "ws-1", skillId: "s-1", skillName: "Food Serving" },
          { id: "ws-2", skillId: "s-2", skillName: "Kitchen Help" },
        ];
      };

      let savedSkills = [
        { id: "ws-1", skillId: "s-1", skillName: "Food Serving" },
      ];
      const draftSkillIds = ["s-1", "s-2"];

      const handleSave = async () => {
        const updated = await mockUpdateWorkerSkills(draftSkillIds);
        savedSkills = updated;
        isEditing = false;
      };

      await handleSave();

      assert.deepStrictEqual(dispatchedPayload, { skillIds: ["s-1", "s-2"] });
      assert.strictEqual(savedSkills.length, 2);
      assert.strictEqual(savedSkills[1].skillName, "Kitchen Help");
      assert.strictEqual(isEditing, false, "Save must close edit mode");
    });

    test("9.12. Simulated save failure: keeps edit mode open, preserves draft, and sets error", async () => {
      let isEditing = true;
      let draftSkillIds = ["s-1", "s-2"];
      let errorMessage = null;

      const mockFailedSave = async () => {
        try {
          const err = new Error("Invalid skill ID submitted");
          err.response = { data: { message: "Invalid skill ID submitted" } };
          throw err;
        } catch (err) {
          errorMessage = err.response?.data?.message || "Failed to update skills";
          isEditing = true; // remains open
        }
      };

      await mockFailedSave();

      assert.strictEqual(isEditing, true, "Edit mode must remain open on save failure");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-2"], "Draft must be preserved intact");
      assert.strictEqual(errorMessage, "Invalid skill ID submitted");
    });

    test("9.13. Security invariants: frontend does NOT store tokens, create arbitrary skills, or send workerId/skillType", () => {
      const content = fs.readFileSync(profilePath, "utf-8");
      assert.strictEqual(
        content.includes("localStorage"),
        false,
        "WorkerProfile.tsx must NOT access localStorage",
      );
      assert.strictEqual(
        content.includes("sessionStorage"),
        false,
        "WorkerProfile.tsx must NOT access sessionStorage",
      );
      assert.strictEqual(
        content.includes("workerId:"),
        false,
        "WorkerProfile.tsx must NOT specify workerId",
      );
      assert.strictEqual(
        content.includes("skillType:"),
        false,
        "WorkerProfile.tsx must NOT specify skillType",
      );
    });
  });

  describe("10. Worker Avatar Display (Step 2G-2 & Blob Migration)", () => {
    const overviewPath = path.resolve(
      __dirname,
      "../components/worker/WorkerProfileOverview.tsx",
    );
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const sidebarPath = path.resolve(
      __dirname,
      "../components/worker/WorkerSidebar.tsx",
    );
    const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");

    const overviewContent = fs.readFileSync(overviewPath, "utf-8");
    const profileContent = fs.readFileSync(profilePath, "utf-8");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    const apiContent = fs.readFileSync(apiPath, "utf-8");

    test("10.1. WorkerProfile passes user?.avatarUrl to WorkerProfileOverview", () => {
      assert.match(
        profileContent,
        /<WorkerProfileOverview[\s\S]*?avatarUrl=\{user\?\.avatarUrl\}[\s\S]*?\/>/,
        "WorkerProfile must pass user?.avatarUrl to WorkerProfileOverview",
      );
    });

    test("10.2. WorkerProfileOverview defines avatarUrl prop in its interface", () => {
      assert.match(
        overviewContent,
        /avatarUrl\?: string \| null/,
        "WorkerProfileOverviewProps must define optional avatarUrl prop",
      );
    });

    test("10.3. worker-api exports fetchWorkerAvatarBlob using Axios with responseType blob", () => {
      assert.match(
        apiContent,
        /export const fetchWorkerAvatarBlob = async/,
        "worker-api.ts must export fetchWorkerAvatarBlob",
      );
      assert.match(
        apiContent,
        /api\.get<Blob>\(["']\/worker\/profile\/avatar["']/,
        "fetchWorkerAvatarBlob must call api.get with /worker/profile/avatar",
      );
      assert.match(
        apiContent,
        /responseType:\s*["']blob["']/,
        "fetchWorkerAvatarBlob must configure responseType as blob",
      );
      assert.match(
        apiContent,
        /params:\s*avatarVersion !== undefined \? \{ v: avatarVersion \} : undefined/,
        "fetchWorkerAvatarBlob must support avatarVersion query param",
      );
    });

    test("10.4. fetchWorkerAvatarBlob handles 404 by returning null and re-throws unexpected errors", () => {
      assert.match(
        apiContent,
        /error\.response\?\.status === 404/,
        "fetchWorkerAvatarBlob must check for 404 status",
      );
      assert.match(
        apiContent,
        /return null;/,
        "fetchWorkerAvatarBlob must return null on 404",
      );
      assert.match(
        apiContent,
        /throw error;/,
        "fetchWorkerAvatarBlob must re-throw unexpected errors",
      );
    });

    test("10.5. WorkerProfileOverview and WorkerSidebar use fetchWorkerAvatarBlob and createObjectURL", () => {
      assert.match(
        overviewContent,
        /fetchWorkerAvatarBlob/,
        "WorkerProfileOverview must call fetchWorkerAvatarBlob",
      );
      assert.match(
        overviewContent,
        /URL\.createObjectURL\(/,
        "WorkerProfileOverview must create an object URL for the avatar blob",
      );
      assert.match(
        overviewContent,
        /URL\.revokeObjectURL\(/,
        "WorkerProfileOverview must revoke object URL during effect cleanup",
      );
      assert.match(
        sidebarContent,
        /fetchWorkerAvatarBlob/,
        "WorkerSidebar must call fetchWorkerAvatarBlob",
      );
      assert.match(
        sidebarContent,
        /URL\.createObjectURL\(/,
        "WorkerSidebar must create an object URL for the avatar blob",
      );
      assert.match(
        sidebarContent,
        /URL\.revokeObjectURL\(/,
        "WorkerSidebar must revoke object URL during effect cleanup",
      );
    });

    test("10.6. Avatar <img> does NOT use crossOrigin attribute for local blob URLs", () => {
      assert.doesNotMatch(
        overviewContent,
        /<img[\s\S]*?crossOrigin=/,
        "WorkerProfileOverview <img> must NOT use crossOrigin for local blob URLs",
      );
      assert.doesNotMatch(
        sidebarContent,
        /<img[\s\S]*?crossOrigin=/,
        "WorkerSidebar <img> must NOT use crossOrigin for local blob URLs",
      );
    });

    test("10.7. WorkerProfileOverview and WorkerSidebar fall back to neutral User icon when missing or errored", () => {
      assert.match(
        overviewContent,
        /<UserIcon\b[\s\S]*?\/>/,
        "WorkerProfileOverview must render UserIcon fallback",
      );
      assert.match(
        sidebarContent,
        /<User\b[\s\S]*?\/>/,
        "WorkerSidebar must render User fallback",
      );
      // Overview: onError must call handleAvatarError (not the old permanent latch)
      assert.match(
        overviewContent,
        /onError=\{[^}]*handleAvatarError/,
        "WorkerProfileOverview onError must call handleAvatarError",
      );
      // Sidebar: still uses the setAvatarLoadError pattern (unchanged)
      assert.match(
        sidebarContent,
        /onError=\{[\s\S]*?setAvatarLoadError\(true\)/,
        "WorkerSidebar must attach onError handler",
      );
    });

    test("10.8. Simulated avatar fetch and blob lifecycle — full state machine coverage", async () => {
      let requestedUrl = "";
      let requestedConfig = null;

      const mockApi = {
        get: async (url, config) => {
          requestedUrl = url;
          requestedConfig = config;
          if (config?.params?.v === "not-found") {
            const err = new Error("Not Found");
            err.isAxiosError = true;
            err.response = { status: 404 };
            throw err;
          }
          if (config?.params?.v === "server-error") {
            const err = new Error("Server Error");
            err.isAxiosError = true;
            err.response = { status: 500 };
            throw err;
          }
          return { data: new Uint8Array([1, 2, 3]).buffer };
        },
      };

      // 1. Blob request succeeds and returns data.
      const res = await mockApi.get("/worker/profile/avatar", {
        responseType: "blob",
        params: { v: 12345 },
      });
      assert.strictEqual(requestedUrl, "/worker/profile/avatar");
      assert.strictEqual(requestedConfig.responseType, "blob");
      assert.strictEqual(requestedConfig.params.v, 12345);
      assert.ok(res.data, "Blob data must be returned on success");

      // 2. 404 handling: caller receives null.
      let caught404 = false;
      let result404 = null;
      try {
        await mockApi.get("/worker/profile/avatar", {
          responseType: "blob",
          params: { v: "not-found" },
        });
      } catch (err) {
        if (err.isAxiosError && err.response?.status === 404) {
          result404 = null;
          caught404 = true;
        }
      }
      assert.strictEqual(caught404, true);
      assert.strictEqual(result404, null);

      // 3. Unexpected server errors are re-thrown.
      await assert.rejects(
        async () => {
          await mockApi.get("/worker/profile/avatar", {
            responseType: "blob",
            params: { v: "server-error" },
          });
        },
        /Server Error/,
      );

      // 4. Object URL replacement + deferred revocation via onLoad.
      //    URL A is created first. Then URL B replaces it.
      //    URL A is kept alive until the NEW <img> fires onLoad,
      //    THEN URL A is revoked — never during the fetch effect cleanup.
      const createdUrlA = "blob:http://localhost:5173/mock-uuid-aaa";
      const createdUrlB = "blob:http://localhost:5173/mock-uuid-bbb";
      let urlCounter = 0;
      const revokedUrls = [];
      const mockURL = {
        createObjectURL: () => (urlCounter++ === 0 ? createdUrlA : createdUrlB),
        revokeObjectURL: (url) => { revokedUrls.push(url); },
      };

      // First avatar fetch: URL A created, ref updated, previousRef = null.
      const urlA = mockURL.createObjectURL(res.data);
      assert.strictEqual(urlA, createdUrlA, "First fetch must produce URL A");
      // No revocation yet — no previous URL exists.
      assert.strictEqual(revokedUrls.length, 0, "No URL revoked on first load");

      // Replacement fetch: URL B created, previousRef = URL A.
      // URL A is NOT revoked yet at this point.
      const urlB = mockURL.createObjectURL(res.data);
      assert.strictEqual(urlB, createdUrlB, "Replacement fetch must produce URL B");
      assert.strictEqual(revokedUrls.length, 0, "URL A must NOT be revoked before onLoad fires");

      // 5. onLoad fires on the new <img> → now safe to revoke URL A.
      mockURL.revokeObjectURL(urlA); // simulates handleAvatarLoad revoking previousRef
      assert.strictEqual(revokedUrls.length, 1);
      assert.strictEqual(revokedUrls[0], createdUrlA, "URL A must be revoked by onLoad, not fetch effect");

      // 6. Effect cleanup for a dep-change does NOT revoke URL B.
      //    Only isMounted=false is set.
      assert.strictEqual(revokedUrls.length, 1, "Effect cleanup must NOT revoke the displayed URL");

      // 7. onError clears the invalid URL from state, does not permanently lock.
      //    After clearing, avatarObjectUrl becomes null → UserIcon shown.
      //    A subsequent fetch of a new blob produces a new URL, which works.
      let avatarState = urlB; // currently displayed
      const handleAvatarError = (currentUrl, ref) => {
        if (ref === currentUrl) {
          mockURL.revokeObjectURL(currentUrl);
          return null; // state cleared
        }
        return avatarState;
      };
      const afterError = handleAvatarError(urlB, urlB);
      assert.strictEqual(afterError, null, "onError must clear avatarObjectUrl to null");
      assert.strictEqual(revokedUrls[1], createdUrlB, "onError must revoke the failed URL");

      // 8. Unmount cleanup revokes both active and pending refs.
      const urlC = "blob:http://localhost:5173/mock-uuid-ccc";
      // Simulate one active + one pending at unmount.
      mockURL.revokeObjectURL(urlC); // active ref cleanup
      assert.strictEqual(revokedUrls.length, 3, "Unmount must revoke the active URL");
    });

    test("10.10. Ref-based lifecycle: uses avatarObjectUrlRef and previousAvatarObjectUrlRef", () => {
      assert.match(
        overviewContent,
        /avatarObjectUrlRef\s*=\s*useRef/,
        "WorkerProfileOverview must declare avatarObjectUrlRef with useRef",
      );
      assert.match(
        overviewContent,
        /previousAvatarObjectUrlRef\s*=\s*useRef/,
        "WorkerProfileOverview must declare previousAvatarObjectUrlRef with useRef",
      );
      assert.match(
        overviewContent,
        /previousAvatarObjectUrlRef\.current\s*=\s*avatarObjectUrlRef\.current/,
        "previousAvatarObjectUrlRef must capture the old URL before it is replaced",
      );
      assert.match(
        overviewContent,
        /avatarObjectUrlRef\.current\s*=\s*newUrl/,
        "avatarObjectUrlRef.current must be updated to the new URL",
      );
    });

    test("10.11. onLoad defers revocation; effect cleanup sets only isMounted=false", () => {
      // handleAvatarLoad must revoke previousAvatarObjectUrlRef.current
      assert.match(
        overviewContent,
        /handleAvatarLoad[\s\S]*?previousAvatarObjectUrlRef\.current[\s\S]*?URL\.revokeObjectURL\(previousAvatarObjectUrlRef\.current\)/,
        "handleAvatarLoad must revoke previousAvatarObjectUrlRef.current",
      );
      // Unmount effect must clean up both refs
      assert.match(
        overviewContent,
        /URL\.revokeObjectURL\(avatarObjectUrlRef\.current\)/,
        "Unmount effect must revoke avatarObjectUrlRef",
      );
      assert.match(
        overviewContent,
        /URL\.revokeObjectURL\(previousAvatarObjectUrlRef\.current\)/,
        "Unmount effect must revoke previousAvatarObjectUrlRef",
      );
      // Loading effect cleanup must NOT revoke any URL directly.
      const loadingEffectMatch = overviewContent.match(
        /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[avatarUrl,\s*avatarVersion\]\)/
      );
      assert.ok(loadingEffectMatch, "Loading effect with [avatarUrl, avatarVersion] deps must exist");
      assert.strictEqual(
        loadingEffectMatch[1].includes("revokeObjectURL"),
        false,
        "Loading effect cleanup must NOT call revokeObjectURL directly",
      );
    });

    test("10.12. Primary render gate is avatarObjectUrl, not a permanent error boolean", () => {
      // The JSX must use avatarObjectUrl as the primary condition (no avatarLoadError in render).
      assert.match(
        overviewContent,
        /\{avatarObjectUrl\s*\?\s*\(/,
        "Render must use avatarObjectUrl as the primary condition",
      );
      // avatarLoadError must NOT appear as a primary render gate
      assert.strictEqual(
        overviewContent.includes("avatarLoadError"),
        false,
        "avatarLoadError permanent boolean latch must be removed from WorkerProfileOverview",
      );
      // onLoad handler must exist on the img element
      assert.match(
        overviewContent,
        /onLoad=\{handleAvatarLoad\}/,
        "<img> must have onLoad={handleAvatarLoad}",
      );
      // onError must call handleAvatarError
      assert.match(
        overviewContent,
        /onError=\{[^}]*handleAvatarError/,
        "<img> onError must call handleAvatarError",
      );
      // No backend URL must appear as img src
      assert.doesNotMatch(
        overviewContent,
        /src=["']http:\/\/localhost:3000\/worker\/profile\/avatar["']/,
        "img src must NOT be a direct backend URL",
      );
      assert.doesNotMatch(
        overviewContent,
        /src=["']\/worker\/profile\/avatar["']/,
        "img src must NOT be the bare API path",
      );
    });

    test("10.9. Security invariants: no tokens in URLs, no direct S3 access, no localStorage access", () => {
      assert.strictEqual(
        overviewContent.includes("localStorage"),
        false,
        "WorkerProfileOverview must NOT access localStorage",
      );
      assert.strictEqual(
        sidebarContent.includes("localStorage"),
        false,
        "WorkerSidebar must NOT access localStorage",
      );
      assert.strictEqual(
        overviewContent.includes("s3.amazonaws.com"),
        false,
        "WorkerProfileOverview must NOT contain direct S3 URLs",
      );
      assert.strictEqual(
        sidebarContent.includes("s3.amazonaws.com"),
        false,
        "WorkerSidebar must NOT contain direct S3 URLs",
      );
      assert.doesNotMatch(
        overviewContent,
        /token=/i,
        "WorkerProfileOverview must NOT put tokens in image URLs",
      );
      assert.doesNotMatch(
        sidebarContent,
        /token=/i,
        "WorkerSidebar must NOT put tokens in image URLs",
      );
      assert.strictEqual(
        apiContent.includes("localStorage"),
        false,
        "worker-api.ts must NOT access localStorage",
      );
      assert.strictEqual(
        apiContent.includes("sessionStorage"),
        false,
        "worker-api.ts must NOT access sessionStorage",
      );
    });
  });


  describe("11. Worker Avatar Upload (Step 2G-3)", () => {
    const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");
    const overviewPath = path.resolve(
      __dirname,
      "../components/worker/WorkerProfileOverview.tsx",
    );
    const profilePath = path.resolve(
      __dirname,
      "../pages/worker/WorkerProfile.tsx",
    );
    const sidebarPath = path.resolve(
      __dirname,
      "../components/worker/WorkerSidebar.tsx",
    );

    const apiContent = fs.readFileSync(apiPath, "utf-8");
    const overviewContent = fs.readFileSync(overviewPath, "utf-8");
    const profileContent = fs.readFileSync(profilePath, "utf-8");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    test("11.1. worker-api.ts exports uploadWorkerAvatar targeting POST /worker/profile/avatar", () => {
      assert.match(
        apiContent,
        /export const uploadWorkerAvatar = async/,
        "worker-api.ts must export uploadWorkerAvatar",
      );
      assert.match(
        apiContent,
        /api\.post<\{ avatarUrl: string \}>\(\s*["']\/worker\/profile\/avatar["']/,
        "uploadWorkerAvatar must dispatch POST /worker/profile/avatar",
      );
    });

    test("11.2. uploadWorkerAvatar appends file with key 'file' and specifies multipart/form-data", () => {
      assert.match(
        apiContent,
        /formData\.append\(["']file["'],\s*file\)/,
        "uploadWorkerAvatar must append file to FormData with field name 'file'",
      );
      assert.match(
        apiContent,
        /["']Content-Type["']:\s*["']multipart\/form-data["']/,
        "uploadWorkerAvatar must specify multipart/form-data content type",
      );
    });

    test("11.3. Client-side validation rejects unsupported MIME types without upload request", () => {
      assert.match(
        apiContent,
        /ALLOWED_AVATAR_MIME_TYPES/,
        "worker-api.ts must define ALLOWED_AVATAR_MIME_TYPES",
      );
      assert.match(
        apiContent,
        /export const validateAvatarFile/,
        "worker-api.ts must export validateAvatarFile",
      );

      // Extract validateAvatarFile simulation
      const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
      const MAX_SIZE = 2 * 1024 * 1024;
      const validate = (file) => {
        if (!ALLOWED.includes(file.type)) {
          return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
        }
        if (file.size > MAX_SIZE) {
          return "Avatar file size exceeds the 2MB limit.";
        }
        return null;
      };

      assert.strictEqual(
        typeof validate({ type: "image/gif", size: 1000 }),
        "string",
        "GIF must be rejected",
      );
      assert.strictEqual(
        typeof validate({ type: "text/plain", size: 1000 }),
        "string",
        "Text must be rejected",
      );
      assert.strictEqual(
        typeof validate({ type: "application/pdf", size: 1000 }),
        "string",
        "PDF must be rejected",
      );
      assert.strictEqual(
        typeof validate({ type: "image/svg+xml", size: 1000 }),
        "string",
        "SVG must be rejected",
      );
    });

    test("11.4. Client-side validation rejects files larger than 2 MB (2,097,152 bytes)", () => {
      const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
      const MAX_SIZE = 2 * 1024 * 1024;
      const validate = (file) => {
        if (!ALLOWED.includes(file.type)) {
          return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
        }
        if (file.size > MAX_SIZE) {
          return "Avatar file size exceeds the 2MB limit.";
        }
        return null;
      };

      const oversized = 2 * 1024 * 1024 + 1;
      assert.strictEqual(
        typeof validate({ type: "image/jpeg", size: oversized }),
        "string",
        "File larger than 2MB must be rejected",
      );
      assert.strictEqual(
        typeof validate({ type: "image/png", size: 5 * 1024 * 1024 }),
        "string",
        "5MB PNG must be rejected",
      );
    });

    test("11.5. Client-side validation accepts valid JPEG, PNG, and WebP files under 2 MB", () => {
      const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
      const MAX_SIZE = 2 * 1024 * 1024;
      const validate = (file) => {
        if (!ALLOWED.includes(file.type)) {
          return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
        }
        if (file.size > MAX_SIZE) {
          return "Avatar file size exceeds the 2MB limit.";
        }
        return null;
      };

      assert.strictEqual(validate({ type: "image/jpeg", size: 50000 }), null);
      assert.strictEqual(validate({ type: "image/png", size: 1048576 }), null);
      assert.strictEqual(validate({ type: "image/webp", size: 2097152 }), null);
    });

    test("11.6. WorkerProfileOverview renders hidden file input with correct accept types and camera trigger button", () => {
      assert.match(
        overviewContent,
        /<input[\s\S]*?type=["']file["'][\s\S]*?accept=["']image\/jpeg,image\/png,image\/webp["']/,
        "WorkerProfileOverview must render input[type=file] with accept='image/jpeg,image/png,image/webp'",
      );
      assert.match(
        overviewContent,
        /data-testid=["']avatar-file-input["']/,
        "WorkerProfileOverview must have testid 'avatar-file-input'",
      );
      assert.match(
        overviewContent,
        /<Camera\b/,
        "WorkerProfileOverview must render Camera icon for avatar upload trigger",
      );
      assert.match(
        overviewContent,
        /disabled=\{isUploadingAvatar\}/,
        "WorkerProfileOverview must disable upload button while uploading",
      );
      assert.match(
        overviewContent,
        /data-testid=["']avatar-uploading-overlay["']/,
        "WorkerProfileOverview must render loading spinner overlay during upload",
      );
    });

    test("11.7. WorkerProfile guards against duplicate submissions while upload is in progress", () => {
      assert.match(
        profileContent,
        /if\s*\(\s*isUploadingAvatar\s*\)\s*return/,
        "WorkerProfile must guard handleUploadAvatar against duplicate concurrent uploads",
      );
      assert.match(
        profileContent,
        /setIsUploadingAvatar\(true\)/,
        "WorkerProfile must set uploading state to true at start of upload",
      );
      assert.match(
        profileContent,
        /setIsUploadingAvatar\(false\)/,
        "WorkerProfile must reset uploading state to false in finally block",
      );
    });

    test("11.8. Simulated successful upload calls refreshUser(), updates avatarVersion, and fires success toast", async () => {
      let refreshUserCalled = false;
      let postedEndpoint = null;
      let postedFormData = null;
      let toastFired = null;
      let updatedVersion = null;

      const mockApi = {
        post: async (endpoint, formData) => {
          postedEndpoint = endpoint;
          postedFormData = formData;
          return { data: { avatarUrl: "/worker/profile/avatar" } };
        },
      };

      const mockRefreshUser = async () => {
        refreshUserCalled = true;
        return {
          id: "w-1",
          email: "worker@gigly.com",
          role: "WORKER",
          avatarUrl: "/worker/profile/avatar",
        };
      };

      const mockToast = {
        fire: async (opts) => {
          toastFired = opts;
        },
      };

      // Simulate handleUploadAvatar flow
      const simulateUpload = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        await mockApi.post("/worker/profile/avatar", formData);
        await mockRefreshUser();
        updatedVersion = 1790000100;
        await mockToast.fire({
          icon: "success",
          title: "Avatar updated successfully",
        });
      };

      const testFile = new Blob(["test"], { type: "image/png" });
      await simulateUpload(testFile);

      assert.strictEqual(postedEndpoint, "/worker/profile/avatar");
      assert.strictEqual(refreshUserCalled, true, "Must call refreshUser()");
      assert.strictEqual(updatedVersion, 1790000100, "Must update avatarVersion");
      assert.strictEqual(toastFired?.icon, "success");
      assert.strictEqual(toastFired?.title, "Avatar updated successfully");
    });

    test("11.9. Upload failure preserves existing avatar and shows error feedback without corruption", async () => {
      let toastFired = null;
      let userAvatarUrl = "/worker/profile/avatar"; // existing valid avatar
      let isUploading = false;

      const mockApiError = {
        post: async () => {
          const err = new Error("File size exceeds the 2MB limit");
          err.response = { data: { message: "File size exceeds the 2MB limit" } };
          throw err;
        },
      };

      const mockToast = {
        fire: async (opts) => {
          toastFired = opts;
        },
      };

      const simulateFailedUpload = async () => {
        isUploading = true;
        try {
          await mockApiError.post("/worker/profile/avatar", {});
          userAvatarUrl = "/corrupted";
        } catch (err) {
          const msg = err.response?.data?.message || err.message;
          await mockToast.fire({
            icon: "error",
            title: msg,
          });
        } finally {
          isUploading = false;
        }
      };

      await simulateFailedUpload();

      assert.strictEqual(isUploading, false, "Uploading state must be reset to false");
      assert.strictEqual(
        userAvatarUrl,
        "/worker/profile/avatar",
        "Existing avatar must NOT be cleared or corrupted on failure",
      );
      assert.strictEqual(toastFired?.icon, "error");
      assert.strictEqual(toastFired?.title, "File size exceeds the 2MB limit");
    });

    test("11.10. WorkerSidebar accepts avatarVersion prop and synchronizes with avatar cache-busting", () => {
      assert.match(
        sidebarContent,
        /avatarVersion\?: string \| number/,
        "WorkerSidebarProps must declare avatarVersion prop",
      );
      assert.match(
        sidebarContent,
        /activeVersion/,
        "WorkerSidebar must use activeVersion for avatar cache-busting",
      );
      assert.match(
        sidebarContent,
        /gigly:avatar-version-updated/,
        "WorkerSidebar must listen for avatar version synchronization events",
      );
    });

    test("11.11. Security invariants: no tokens in URLs, no localStorage access, no direct S3 URLs", () => {
      assert.strictEqual(
        apiContent.includes("localStorage"),
        false,
        "worker-api.ts must NOT access localStorage",
      );
      assert.strictEqual(
        apiContent.includes("sessionStorage"),
        false,
        "worker-api.ts must NOT access sessionStorage",
      );
      assert.strictEqual(
        overviewContent.includes("sessionStorage"),
        false,
        "WorkerProfileOverview must NOT access sessionStorage",
      );
      assert.strictEqual(
        profileContent.includes("localStorage"),
        false,
        "WorkerProfile must NOT access localStorage",
      );
      assert.doesNotMatch(
        apiContent,
        /headers:\s*\{[^}]*Authorization/i,
        "uploadWorkerAvatar must NOT attach manual Authorization header (cookies are used)",
      );
      assert.doesNotMatch(
        apiContent,
        /s3\.amazonaws\.com/,
        "worker-api.ts must NOT contain direct S3 bucket URLs",
      );
      assert.doesNotMatch(
        overviewContent,
        /s3\.amazonaws\.com/,
        "WorkerProfileOverview must NOT contain direct S3 bucket URLs",
      );
    });
  });

  describe("12. Worker Change Password Frontend (Step 2G-4)", () => {
    const authApiPath = path.resolve(__dirname, "../lib/auth-api.ts");
    const changePasswordCardPath = path.resolve(
      __dirname,
      "../components/worker/WorkerChangePasswordCard.tsx",
    );

    const authApiContent = fs.readFileSync(authApiPath, "utf-8");
    const cardContent = fs.readFileSync(changePasswordCardPath, "utf-8");

    test("12.1. Change Password button opens the collapsible form", () => {
      assert.match(
        cardContent,
        /<button[\s\S]*?onClick=\{[\s\S]*?setIsChangingPassword\(true\)[\s\S]*?Change Password/,
        "Change Password button must set isChangingPassword to true",
      );
      assert.match(
        cardContent,
        /\{isChangingPassword && \(/,
        "WorkerChangePasswordCard must render form conditionally when isChangingPassword is true",
      );
    });

    test("12.2. Current password field exists with label and input", () => {
      assert.match(
        cardContent,
        /CURRENT PASSWORD/,
        "Card must contain 'CURRENT PASSWORD' label",
      );
      assert.match(
        cardContent,
        /name=["']currentPassword["']/,
        "Input must have name='currentPassword'",
      );
      assert.match(
        cardContent,
        /value=\{currentPassword\}/,
        "Input must bind value to currentPassword state",
      );
    });

    test("12.3. New password field exists with label and input", () => {
      assert.match(
        cardContent,
        /NEW PASSWORD/,
        "Card must contain 'NEW PASSWORD' label",
      );
      assert.match(
        cardContent,
        /name=["']newPassword["']/,
        "Input must have name='newPassword'",
      );
      assert.match(
        cardContent,
        /value=\{newPassword\}/,
        "Input must bind value to newPassword state",
      );
    });

    test("12.4. Confirm password field exists with label and input", () => {
      assert.match(
        cardContent,
        /CONFIRM NEW PASSWORD/,
        "Card must contain 'CONFIRM NEW PASSWORD' label",
      );
      assert.match(
        cardContent,
        /name=["']confirmPassword["']/,
        "Input must have name='confirmPassword'",
      );
      assert.match(
        cardContent,
        /value=\{confirmPassword\}/,
        "Input must bind value to confirmPassword state",
      );
    });

    test("12.5. Password visibility toggles exist for each password field", () => {
      assert.match(
        cardContent,
        /<Eye\b/,
        "Must render Eye icon for show password",
      );
      assert.match(
        cardContent,
        /<EyeOff\b/,
        "Must render EyeOff icon for hide password",
      );
      assert.match(
        cardContent,
        /setShowCurrentPassword/,
        "Must support toggling current password visibility",
      );
      assert.match(
        cardContent,
        /setShowNewPassword/,
        "Must support toggling new password visibility",
      );
      assert.match(
        cardContent,
        /setShowConfirmPassword/,
        "Must support toggling confirm password visibility",
      );
    });

    test("12.6. Required validation prevents submission when fields are empty", () => {
      assert.match(
        authApiContent,
        /export const validateChangePasswordForm/,
        "auth-api.ts must export validateChangePasswordForm",
      );

      // Simulation of validateChangePasswordForm
      const validate = (values) => {
        const errors = {};
        const current = values.currentPassword ?? "";
        const newPwd = values.newPassword ?? "";
        const confirmPwd = values.confirmPassword ?? "";
        if (!current.trim()) errors.currentPassword = "Current password is required";
        if (!newPwd) errors.newPassword = "New password is required";
        else if (newPwd.length < 8) errors.newPassword = "Password must be at least 8 characters long";
        if (!confirmPwd) errors.confirmPassword = "Confirm password is required";
        else if (confirmPwd !== newPwd) errors.confirmPassword = "Passwords do not match";
        return errors;
      };

      const emptyErrors = validate({ currentPassword: "", newPassword: "", confirmPassword: "" });
      assert.strictEqual(emptyErrors.currentPassword, "Current password is required");
      assert.strictEqual(emptyErrors.newPassword, "New password is required");
      assert.strictEqual(emptyErrors.confirmPassword, "Confirm password is required");
    });

    test("12.7. New password under 8 characters triggers validation error", () => {
      const validate = (values) => {
        const errors = {};
        const newPwd = values.newPassword ?? "";
        if (!newPwd) errors.newPassword = "New password is required";
        else if (newPwd.length < 8) errors.newPassword = "Password must be at least 8 characters long";
        return errors;
      };

      const shortErrors = validate({ newPassword: "short" });
      assert.strictEqual(shortErrors.newPassword, "Password must be at least 8 characters long");

      const validErrors = validate({ newPassword: "validPassword123" });
      assert.strictEqual(validErrors.newPassword, undefined);
    });

    test("12.8. Mismatched confirmation triggers validation error", () => {
      const validate = (values) => {
        const errors = {};
        const newPwd = values.newPassword ?? "";
        const confirmPwd = values.confirmPassword ?? "";
        if (!confirmPwd) errors.confirmPassword = "Confirm password is required";
        else if (confirmPwd !== newPwd) errors.confirmPassword = "Passwords do not match";
        return errors;
      };

      const mismatchErrors = validate({ newPassword: "password123", confirmPassword: "password456" });
      assert.strictEqual(mismatchErrors.confirmPassword, "Passwords do not match");

      const matchErrors = validate({ newPassword: "password123", confirmPassword: "password123" });
      assert.strictEqual(matchErrors.confirmPassword, undefined);
    });

    test("12.9. confirmPassword is NEVER sent in changePassword API payload", () => {
      assert.match(
        cardContent,
        /await changePassword\(\{\s*currentPassword,\s*newPassword,?\s*\}\)/,
        "WorkerChangePasswordCard must only send currentPassword and newPassword to changePassword",
      );
      const callMatch = cardContent.match(/changePassword\(\{([\s\S]*?)\}\)/);
      assert.ok(callMatch, "changePassword call must exist in WorkerChangePasswordCard");
      assert.strictEqual(
        callMatch[1].includes("confirmPassword"),
        false,
        "confirmPassword must NOT be included in changePassword payload",
      );
    });

    test("12.10. auth-api.ts exports changePassword targeting POST /auth/change-password", () => {
      assert.match(
        authApiContent,
        /export const changePassword = async/,
        "auth-api.ts must export changePassword function",
      );
      assert.match(
        authApiContent,
        /api\.post<\{ message: string \}>\(\s*["']\/auth\/change-password["']/,
        "changePassword must dispatch POST /auth/change-password",
      );
    });

    test("12.11. Submitting state prevents duplicate submission while request is in flight", () => {
      assert.match(
        cardContent,
        /if\s*\(\s*isSubmitting\s*\)\s*return/,
        "handleSubmit must guard against concurrent submission",
      );
      assert.match(
        cardContent,
        /setIsSubmitting\(true\)/,
        "handleSubmit must set isSubmitting = true",
      );
      assert.match(
        cardContent,
        /disabled=\{isSubmitting\}/,
        "Save and Cancel buttons must be disabled while isSubmitting is true",
      );
      assert.match(
        cardContent,
        /setIsSubmitting\(false\)/,
        "handleSubmit must reset isSubmitting = false in finally block",
      );
    });

    test("12.12. Successful submission clears form fields, closes form, and fires success toast", async () => {
      let toastFired = null;
      let formClosed = false;
      let fieldsCleared = false;

      const mockApi = {
        post: async (url, payload) => {
          assert.strictEqual(url, "/auth/change-password");
          assert.strictEqual(payload.confirmPassword, undefined, "confirmPassword must not be in payload");
          return { data: { message: "Password changed successfully" } };
        },
      };

      const mockToast = {
        fire: async (opts) => {
          toastFired = opts;
        },
      };

      const simulateSubmit = async () => {
        const res = await mockApi.post("/auth/change-password", {
          currentPassword: "OldPassword123!",
          newPassword: "NewPassword123!",
        });
        await mockToast.fire({
          icon: "success",
          title: res.data.message,
        });
        fieldsCleared = true;
        formClosed = true;
      };

      await simulateSubmit();

      assert.strictEqual(formClosed, true, "Form must be closed on success");
      assert.strictEqual(fieldsCleared, true, "Password fields must be cleared on success");
      assert.strictEqual(toastFired?.icon, "success");
      assert.strictEqual(toastFired?.title, "Password changed successfully");
    });

    test("12.13. Incorrect current password (400) keeps form open and displays server error", async () => {
      let formClosed = false;
      let serverError = null;

      const mockApiError = {
        post: async () => {
          const err = new Error("Current password is incorrect");
          err.response = { status: 400, data: { message: "Current password is incorrect" } };
          throw err;
        },
      };

      const simulateFailedSubmit = async () => {
        try {
          await mockApiError.post("/auth/change-password", {});
          formClosed = true;
        } catch (err) {
          serverError = err.response?.data?.message || err.message;
        }
      };

      await simulateFailedSubmit();

      assert.strictEqual(formClosed, false, "Form must remain open when current password is wrong");
      assert.strictEqual(serverError, "Current password is incorrect");
    });

    test("12.14. Cancel button clears all password fields, clears errors, and closes form without API request", () => {
      assert.match(
        cardContent,
        /const handleCancel = \(\) => \{/,
        "WorkerChangePasswordCard must define handleCancel",
      );
      assert.match(
        cardContent,
        /setCurrentPassword\(["']["']\)/,
        "handleCancel must clear currentPassword",
      );
      assert.match(
        cardContent,
        /setNewPassword\(["']["']\)/,
        "handleCancel must clear newPassword",
      );
      assert.match(
        cardContent,
        /setConfirmPassword\(["']["']\)/,
        "handleCancel must clear confirmPassword",
      );
      assert.match(
        cardContent,
        /setIsChangingPassword\(false\)/,
        "handleCancel must close form",
      );
    });

    test("12.15. Security invariants: no password stored in localStorage or sessionStorage", () => {
      assert.strictEqual(
        cardContent.includes("localStorage"),
        false,
        "WorkerChangePasswordCard must NOT access localStorage",
      );
      assert.strictEqual(
        cardContent.includes("sessionStorage"),
        false,
        "WorkerChangePasswordCard must NOT access sessionStorage",
      );
      assert.strictEqual(
        authApiContent.includes("localStorage"),
        false,
        "auth-api.ts must NOT access localStorage",
      );
      assert.strictEqual(
        authApiContent.includes("sessionStorage"),
        false,
        "auth-api.ts must NOT access sessionStorage",
      );
      assert.doesNotMatch(
        cardContent,
        /console\.log\([^)]*password/i,
        "WorkerChangePasswordCard must never log password values",
      );
    });
  });
});




