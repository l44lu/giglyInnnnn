import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readComponent = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

describe("Step 3.8: Recruiter Profile Frontend — Figma-Based Implementation", () => {
  // ─── Source files ────────────────────────────────────────────────
  const profilePage = readComponent("../pages/recruiter/RecruiterProfile.tsx");
  const overview = readComponent(
    "../components/recruiter/RecruiterProfileOverview.tsx",
  );
  const personalInfo = readComponent(
    "../components/recruiter/RecruiterPersonalInfoCard.tsx",
  );
  const professional = readComponent(
    "../components/recruiter/RecruiterProfessionalCard.tsx",
  );
  const companyCard = readComponent(
    "../components/recruiter/RecruiterCompanyCard.tsx",
  );
  const changePassword = readComponent(
    "../components/recruiter/RecruiterChangePasswordCard.tsx",
  );
  const barrel = readComponent("../components/recruiter/index.ts");
  const recruiterApi = readComponent("../lib/recruiter-api.ts");
  const types = readComponent("../types/recruiter-profile.ts");

  // ─── 1. Profile page renders real user data ──────────────────────
  describe("1. Profile page renders real user data", () => {
    test("1.1. Page renders authenticated user data from useAuth context", () => {
      assert.match(profilePage, /useAuth/);
      assert.match(profilePage, /user\?\.firstName/);
      assert.match(profilePage, /user\?\.lastName/);
    });

    test("1.2. Page passes displayName to ProfileOverview", () => {
      assert.match(profilePage, /displayName=\{displayName\}/);
    });

    test("1.3. ProfileOverview displays avatar from authenticated blob", () => {
      assert.match(overview, /fetchRecruiterAvatarBlob/);
      assert.match(overview, /URL\.createObjectURL/);
    });
  });

  // ─── 2. Professional data uses roleTitle and yearsExperience ─────
  describe("2. Professional data uses roleTitle and yearsExperience", () => {
    test("2.1. RecruiterProfileOverview shows roleTitle", () => {
      assert.match(overview, /roleTitle/);
    });

    test("2.2. RecruiterProfileOverview shows yearsExperience", () => {
      assert.match(overview, /yearsExperience/);
    });

    test("2.3. RecruiterProfessionalCard edits roleTitle", () => {
      assert.match(professional, /roleTitle/);
      assert.match(professional, /onChangeRoleTitle/);
    });

    test("2.4. RecruiterProfessionalCard edits yearsExperience", () => {
      assert.match(professional, /yearsExperience/);
      assert.match(professional, /onChangeYearsExperience/);
    });
  });

  // ─── 3. Figma-only fake statistics are NOT rendered ──────────────
  describe("3. Figma-only fake statistics are NOT rendered", () => {
    const allComponents = [
      profilePage,
      overview,
      personalInfo,
      professional,
      companyCard,
      changePassword,
    ].join("\n");

    test("3.1. No 'Completed Jobs' stat anywhere", () => {
      assert.doesNotMatch(
        allComponents,
        /Completed\s+Jobs/i,
        "Completed Jobs is a Figma-only element and must not appear",
      );
    });

    test("3.2. No 'Clients' count stat", () => {
      // Allow 'Clients' as a navigation label, but not as a statistic with a number
      assert.doesNotMatch(
        overview,
        /Clients/i,
        "Clients stat from Figma must not appear in ProfileOverview",
      );
    });

    test("3.3. No 'Response Time' stat", () => {
      assert.doesNotMatch(
        overview,
        /Response\s+Time/i,
        "Response Time stat from Figma must not appear",
      );
    });

    test("3.4. No 'Member Since' stat", () => {
      assert.doesNotMatch(
        overview,
        /Member\s+Since/i,
        "Member Since stat from Figma must not appear",
      );
    });

    test("3.5. No 4.8 rating stat", () => {
      assert.doesNotMatch(
        overview,
        /4\.8\s*rating/i,
        "4.8 rating from Figma must not appear",
      );
    });

    test("3.6. No 'Verified profile' badge", () => {
      assert.doesNotMatch(
        overview,
        /Verified\s+profile/i,
        "Verified profile badge from Figma must not appear",
      );
    });

    test("3.7. No 'Open to work' status in recruiter overview", () => {
      assert.doesNotMatch(
        overview,
        /Open\s+to\s+work/i,
        "Open to work is a worker feature and must not appear for recruiter",
      );
    });
  });

  // ─── 4. Account Type is NOT rendered ─────────────────────────────
  describe("4. Account Type is NOT rendered", () => {
    test("4.1. No Account Type selector in any recruiter component", () => {
      const all = [
        profilePage,
        overview,
        personalInfo,
        professional,
        companyCard,
      ].join("\n");
      assert.doesNotMatch(
        all,
        /Account\s+Type/i,
        "Account Type selector from Figma must not appear",
      );
    });
  });

  // ─── 5. Company API GET integration ──────────────────────────────
  describe("5. Company API GET integration", () => {
    test("5.1. recruiter-api.ts exports getRecruiterCompany", () => {
      assert.match(recruiterApi, /export const getRecruiterCompany\s*=/);
    });

    test("5.2. getRecruiterCompany targets /recruiter/company endpoint", () => {
      assert.match(recruiterApi, /["']\/recruiter\/company["']/);
    });

    test("5.3. RecruiterCompanyCard calls getRecruiterCompany on mount", () => {
      assert.match(companyCard, /getRecruiterCompany/);
    });
  });

  // ─── 6. Company empty state when no company exists ───────────────
  describe("6. Company empty state when no company exists", () => {
    test("6.1. CompanyCard handles 404 response gracefully (not fatal error)", () => {
      assert.match(
        companyCard,
        /err\.response\?\.status\s*===\s*404/,
        "CompanyCard must handle 404 as 'no company' not as an error",
      );
    });

    test("6.2. CompanyCard renders 'No company profile configured yet' empty state", () => {
      assert.match(
        companyCard,
        /No company profile configured yet/,
        "Empty state message must appear when company is null",
      );
    });

    test("6.3. CompanyCard renders 'Add Company' button in empty state", () => {
      assert.match(
        companyCard,
        /Add Company/,
        "Add Company button must appear in empty state",
      );
    });
  });

  // ─── 7. Company creation/update ──────────────────────────────────
  describe("7. Company creation/update", () => {
    test("7.1. recruiter-api.ts exports updateRecruiterCompany", () => {
      assert.match(recruiterApi, /export const updateRecruiterCompany\s*=/);
    });

    test("7.2. updateRecruiterCompany uses PATCH /recruiter/company", () => {
      assert.match(
        recruiterApi,
        /api\.patch.*["']\/recruiter\/company["']/s,
        "Must use PATCH method for company update",
      );
    });

    test("7.3. CompanyCard form has company name (required) field", () => {
      assert.match(companyCard, /company-name/);
      assert.match(companyCard, /Company Name/);
    });

    test("7.4. CompanyCard validates company name is required", () => {
      assert.match(
        companyCard,
        /Company name is required/,
        "Name validation error message must exist",
      );
    });

    test("7.5. CompanyCard form has industry, companySize, website, headquarters, about fields", () => {
      assert.match(companyCard, /company-industry/);
      assert.match(companyCard, /company-size/);
      assert.match(companyCard, /company-website/);
      assert.match(companyCard, /company-headquarters/);
      assert.match(companyCard, /company-about/);
    });
  });

  // ─── 8. Company logo upload ──────────────────────────────────────
  describe("8. Company logo upload", () => {
    test("8.1. recruiter-api.ts exports uploadRecruiterCompanyLogo", () => {
      assert.match(
        recruiterApi,
        /export const uploadRecruiterCompanyLogo\s*=/,
      );
    });

    test("8.2. uploadRecruiterCompanyLogo posts to /recruiter/company/logo", () => {
      assert.match(recruiterApi, /["']\/recruiter\/company\/logo["']/);
    });

    test("8.3. CompanyCard has file input for logo upload", () => {
      assert.match(companyCard, /type="file"/);
      assert.match(
        companyCard,
        /accept="image\/jpeg,image\/png,image\/webp"/,
      );
    });

    test("8.4. CompanyCard validates logo file before upload", () => {
      assert.match(companyCard, /validateLogoFile/);
    });
  });

  // ─── 9. Company logo Blob rendering ──────────────────────────────
  describe("9. Company logo Blob rendering", () => {
    test("9.1. recruiter-api.ts exports fetchRecruiterCompanyLogoBlob", () => {
      assert.match(
        recruiterApi,
        /export const fetchRecruiterCompanyLogoBlob\s*=/,
      );
    });

    test("9.2. CompanyCard uses URL.createObjectURL for logo rendering", () => {
      assert.match(companyCard, /URL\.createObjectURL/);
    });
  });

  // ─── 10. Company logo fallback ───────────────────────────────────
  describe("10. Company logo fallback", () => {
    test("10.1. CompanyCard renders Building2 icon when no logo", () => {
      assert.match(companyCard, /Building2/);
    });

    test("10.2. CompanyCard handles logo load error gracefully", () => {
      assert.match(companyCard, /onError/);
    });
  });

  // ─── 11. Object URL cleanup ──────────────────────────────────────
  describe("11. Object URL cleanup", () => {
    test("11.1. CompanyCard calls URL.revokeObjectURL on unmount", () => {
      assert.match(companyCard, /URL\.revokeObjectURL/);
    });

    test("11.2. CompanyCard tracks previous object URL for revocation", () => {
      assert.match(companyCard, /previousLogoObjectUrlRef/);
    });

    test("11.3. ProfileOverview calls URL.revokeObjectURL for avatar cleanup", () => {
      assert.match(overview, /URL\.revokeObjectURL/);
    });
  });

  // ─── 12. Personal info save ──────────────────────────────────────
  describe("12. Personal info save", () => {
    test("12.1. PersonalInfoCard calls updateRecruiterPersonalProfile", () => {
      assert.match(personalInfo, /updateRecruiterPersonalProfile/);
    });

    test("12.2. PersonalInfoCard sends firstName, lastName, phone, location, bio", () => {
      assert.match(personalInfo, /firstName/);
      assert.match(personalInfo, /lastName/);
      assert.match(personalInfo, /phone/);
      assert.match(personalInfo, /location/);
      assert.match(personalInfo, /bio/);
    });

    test("12.3. PersonalInfoCard has edit/save/cancel controls", () => {
      assert.match(personalInfo, /handleStartEditingPersonal/);
      assert.match(personalInfo, /handleSavePersonal/);
      assert.match(personalInfo, /handleCancelPersonal/);
    });
  });

  // ─── 13. Professional info save ──────────────────────────────────
  describe("13. Professional info save", () => {
    test("13.1. RecruiterProfile calls updateRecruiterProfile for professional info", () => {
      assert.match(profilePage, /updateRecruiterProfile/);
    });

    test("13.2. ProfessionalCard receives edit state props", () => {
      assert.match(professional, /isEditingDetails/);
      assert.match(professional, /isSavingDetails/);
      assert.match(professional, /onChangeRoleTitle/);
    });
  });

  // ─── 14. Password change integration ─────────────────────────────
  describe("14. Password change integration", () => {
    test("14.1. ChangePasswordCard imports changePassword from auth-api", () => {
      assert.match(changePassword, /changePassword/);
      assert.match(changePassword, /auth-api/);
    });

    test("14.2. ChangePasswordCard validates form before submit", () => {
      assert.match(changePassword, /validateChangePasswordForm/);
    });

    test("14.3. ChangePasswordCard has current, new, and confirm password fields", () => {
      assert.match(changePassword, /recruiter-current-password/);
      assert.match(changePassword, /recruiter-new-password/);
      assert.match(changePassword, /recruiter-confirm-password/);
    });
  });

  // ─── 15. No companyId/userId/recruiterId sent from frontend ──────
  describe("15. No companyId/userId/recruiterId is sent from the frontend", () => {
    test("15.1. updateRecruiterProfile does NOT send companyId", () => {
      // Check the UpdateRecruiterProfilePayload type
      const payloadMatch = types.match(
        /export interface UpdateRecruiterProfilePayload\s*\{([^}]+)\}/,
      );
      assert.ok(payloadMatch, "UpdateRecruiterProfilePayload must be defined");
      assert.doesNotMatch(
        payloadMatch[1],
        /companyId/,
        "UpdateRecruiterProfilePayload must not contain companyId",
      );
    });

    test("15.2. updateRecruiterPersonalProfile does NOT send userId or recruiterId", () => {
      // Check UpdateRecruiterPersonalProfilePayload type
      const payloadMatch = types.match(
        /export interface UpdateRecruiterPersonalProfilePayload\s*\{([^}]+)\}/,
      );
      assert.ok(payloadMatch, "UpdateRecruiterPersonalProfilePayload must be defined");
      assert.doesNotMatch(
        payloadMatch[1],
        /userId/,
        "UpdateRecruiterPersonalProfilePayload must not contain userId",
      );
      assert.doesNotMatch(
        payloadMatch[1],
        /recruiterId/,
        "UpdateRecruiterPersonalProfilePayload must not contain recruiterId",
      );
    });

    test("15.3. UpdateCompanyPayload does NOT contain companyId, userId, or recruiterId", () => {
      const payloadMatch = types.match(
        /export interface UpdateCompanyPayload\s*\{([^}]+)\}/,
      );
      assert.ok(payloadMatch, "UpdateCompanyPayload must be defined");
      assert.doesNotMatch(payloadMatch[1], /companyId/);
      assert.doesNotMatch(payloadMatch[1], /userId/);
      assert.doesNotMatch(payloadMatch[1], /recruiterId/);
    });
  });

  // ─── 16. Authenticated recruiter profile route is protected ──────
  describe("16. Authenticated recruiter profile route is protected", () => {
    const appContent = readComponent("../App.tsx");

    test("16.1. /recruiter/profile is wrapped in ProtectedRoute with RECRUITER role", () => {
      assert.match(
        appContent,
        /path=["']\/recruiter\/profile["']/,
        "Route must be registered",
      );
      assert.match(
        appContent,
        /<ProtectedRoute\s+allowedRoles=\{(\[.*?"RECRUITER".*?\])\}>\s*<RecruiterProfile\s*\/>\s*<\/ProtectedRoute>/s,
        "Route must be protected with RECRUITER role",
      );
    });
  });

  // ─── 17. Component barrel exports ────────────────────────────────
  describe("17. Component barrel exports", () => {
    test("17.1. RecruiterCompanyCard is exported from barrel", () => {
      assert.match(barrel, /RecruiterCompanyCard/);
    });

    test("17.2. RecruiterProfile page imports RecruiterCompanyCard", () => {
      assert.match(profilePage, /RecruiterCompanyCard/);
    });

    test("17.3. RecruiterProfile page renders RecruiterCompanyCard", () => {
      assert.match(profilePage, /<RecruiterCompanyCard/);
    });
  });

  // ─── 18. Company card visual design consistency ──────────────────
  describe("18. Company card uses Figma-consistent design language", () => {
    test("18.1. CompanyCard uses rounded-2xl card styling like other cards", () => {
      assert.match(companyCard, /rounded-2xl/);
    });

    test("18.2. CompanyCard uses bg-white card background", () => {
      assert.match(companyCard, /bg-white/);
    });

    test("18.3. CompanyCard uses border-slate-200 borders", () => {
      assert.match(companyCard, /border-slate-200/);
    });

    test("18.4. CompanyCard uses blue primary action color #1877f2", () => {
      assert.match(companyCard, /#1877f2/);
    });

    test("18.5. CompanyCard uses same font size/weight patterns as other cards", () => {
      assert.match(companyCard, /text-lg font-bold/);
      assert.match(companyCard, /text-xs font-semibold/);
    });
  });

  // ─── 19. ProfessionalCard no longer has Company Affiliation ──────
  describe("19. ProfessionalCard removed Company Affiliation section", () => {
    test("19.1. ProfessionalCard does NOT display Company Affiliation section", () => {
      assert.doesNotMatch(
        professional,
        /Company Affiliation/,
        "Company Affiliation section must be removed since RecruiterCompanyCard handles it",
      );
    });

    test("19.2. ProfessionalCard does NOT import Building icon", () => {
      assert.doesNotMatch(
        professional,
        /Building/,
        "Building icon import should be removed with Company Affiliation",
      );
    });
  });

  // ─── 20. API client uses cookies, no manual tokens ───────────────
  describe("20. API client uses cookies, no manual token handling", () => {
    test("20.1. recruiter-api does not use localStorage", () => {
      assert.doesNotMatch(recruiterApi, /localStorage/);
    });

    test("20.2. recruiter-api does not use sessionStorage", () => {
      assert.doesNotMatch(recruiterApi, /sessionStorage/);
    });

    test("20.3. recruiter-api does not manually attach Bearer token", () => {
      assert.doesNotMatch(recruiterApi, /Bearer\s+\$\{/);
    });
  });
});
