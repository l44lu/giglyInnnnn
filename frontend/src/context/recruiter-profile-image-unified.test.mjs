import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readComponent = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

describe("Step 4C: Unified Recruiter Profile Image Integration Tests", () => {
  const profilePage = readComponent("../pages/recruiter/RecruiterProfile.tsx");
  const overview = readComponent(
    "../components/recruiter/RecruiterProfileOverview.tsx",
  );
  const companyCard = readComponent(
    "../components/recruiter/RecruiterCompanyCard.tsx",
  );
  const sidebar = readComponent(
    "../components/recruiter/RecruiterSidebar.tsx",
  );
  const recruiterApi = readComponent("../lib/recruiter-api.ts");
  const baseApi = readComponent("../lib/api.ts");

  // ─── 1. Backend Endpoint Integration & API Contracts ────────────────────────
  describe("1. Backend Endpoint Integration & API Contracts", () => {
    test("1.1. recruiter-api.ts exports removeRecruiterAvatar targeting DELETE /recruiter/profile/avatar", () => {
      assert.match(
        recruiterApi,
        /export const removeRecruiterAvatar\s*=\s*async/,
        "recruiter-api.ts must export removeRecruiterAvatar function",
      );
      assert.match(
        recruiterApi,
        /api\.delete<\{\s*avatarUrl:\s*null\s*\}\>\s*\(\s*["']\/recruiter\/profile\/avatar["'],?\s*\)/,
        "removeRecruiterAvatar must dispatch api.delete to /recruiter/profile/avatar",
      );
      assert.doesNotMatch(
        recruiterApi,
        /removeRecruiterAvatar\s*=\s*async\s*\([^)]*\b(userId|id)\b/,
        "removeRecruiterAvatar must NOT require or accept userId; identity derived from session",
      );
    });

    test("1.2. recruiter-api.ts exports removeRecruiterCompanyLogo targeting DELETE /recruiter/company/logo", () => {
      assert.match(
        recruiterApi,
        /export const removeRecruiterCompanyLogo\s*=\s*async/,
        "recruiter-api.ts must export removeRecruiterCompanyLogo function",
      );
      assert.match(
        recruiterApi,
        /api\.delete<\{\s*logoUrl:\s*null\s*\}\>\s*\(\s*["']\/recruiter\/company\/logo["'],?\s*\)/,
        "removeRecruiterCompanyLogo must dispatch api.delete to /recruiter/company/logo",
      );
      assert.doesNotMatch(
        recruiterApi,
        /removeRecruiterCompanyLogo\s*=\s*async\s*\([^)]*\b(companyId|userId|id)\b/,
        "removeRecruiterCompanyLogo must NOT require or accept companyId; association derived from session",
      );
    });

    test("1.3. recruiter-api.ts exports uploadRecruiterAvatar and uploadRecruiterCompanyLogo", () => {
      assert.match(
        recruiterApi,
        /export const uploadRecruiterAvatar\s*=\s*async/,
        "Must export uploadRecruiterAvatar",
      );
      assert.match(
        recruiterApi,
        /["']\/recruiter\/profile\/avatar["']/,
        "uploadRecruiterAvatar posts to /recruiter/profile/avatar",
      );
      assert.match(
        recruiterApi,
        /export const uploadRecruiterCompanyLogo\s*=\s*async/,
        "Must export uploadRecruiterCompanyLogo",
      );
      assert.match(
        recruiterApi,
        /["']\/recruiter\/company\/logo["']/,
        "uploadRecruiterCompanyLogo posts to /recruiter/company/logo",
      );
    });

    test("1.4. recruiter-api.ts exports fetchRecruiterAvatarBlob and fetchRecruiterCompanyLogoBlob", () => {
      assert.match(
        recruiterApi,
        /export const fetchRecruiterAvatarBlob\s*=\s*async/,
        "Must export fetchRecruiterAvatarBlob",
      );
      assert.match(
        recruiterApi,
        /export const fetchRecruiterCompanyLogoBlob\s*=\s*async/,
        "Must export fetchRecruiterCompanyLogoBlob",
      );
    });

    test("1.5. API client uses withCredentials HttpOnly cookies with no manual Bearer tokens", () => {
      assert.match(baseApi, /withCredentials:\s*true/);
      assert.doesNotMatch(recruiterApi, /localStorage/);
      assert.doesNotMatch(recruiterApi, /sessionStorage/);
      assert.doesNotMatch(recruiterApi, /Bearer\s+\$\{/);
    });
  });

  // ─── 2. Unified Profile Image Area in RecruiterProfileOverview ───────────────
  describe("2. Unified Profile Image Area in RecruiterProfileOverview", () => {
    test("2.1. RecruiterProfileOverview receives company association props", () => {
      assert.match(overview, /company\?:\s*Company\s*\|\s*null/);
      assert.match(overview, /hasCompany\?:\s*boolean/);
      assert.match(overview, /isLoadingCompany\?:\s*boolean/);
      assert.match(overview, /companyError\?:\s*string\s*\|\s*null/);
      assert.match(overview, /logoVersion\?:\s*string\s*\|\s*number/);
    });

    test("2.2. RecruiterProfileOverview receives image removal props", () => {
      assert.match(overview, /isRemovingPhoto\?:\s*boolean/);
      assert.match(overview, /onRemovePhoto\?:\s*\(\)\s*=>\s*Promise<void>/);
    });

    test("2.3. RecruiterProfile passes unified image props to RecruiterProfileOverview", () => {
      assert.match(profilePage, /<RecruiterProfileOverview/);
      assert.match(profilePage, /company=\{company\}/);
      assert.match(profilePage, /hasCompany=\{hasLinkedCompany\}/);
      assert.match(profilePage, /isLoadingCompany=\{isLoadingProfile\}/);
      assert.match(profilePage, /companyError=\{profileError\}/);
      assert.match(profilePage, /logoVersion=\{logoVersion\}/);
      assert.match(profilePage, /onUploadAvatar=\{handleUploadProfileImage\}/);
      assert.match(profilePage, /onRemovePhoto=\{handleRemoveProfileImage\}/);
    });
  });

  // ─── 3. Company-Linked Recruiter Display & Management ────────────────────────
  describe("3. Company-Linked Recruiter Display & Management", () => {
    test("3.1. When linked to company, overview fetches company logo via fetchRecruiterCompanyLogoBlob", () => {
      assert.match(
        overview,
        /fetchRecruiterCompanyLogoBlob/,
        "Overview must call fetchRecruiterCompanyLogoBlob when linked to company",
      );
    });

    test("3.2. When linked to company, overview displays Building2 icon when no logo is saved", () => {
      assert.match(
        overview,
        /Building2/,
        "Overview must import and render Building2 icon as fallback",
      );
      assert.match(
        overview,
        /effectiveHasCompany\s*\?\s*\(\s*<Building2/,
        "Building2 must be rendered when effectiveHasCompany is true and no logo exists",
      );
    });

    test("3.3. When linked to company, upload triggers uploadRecruiterCompanyLogo in page coordinator", () => {
      assert.match(
        profilePage,
        /if\s*\(\s*hasLinkedCompany\s*\)\s*\{[\s\S]*?uploadRecruiterCompanyLogo\(file\)/,
        "Page must route upload to uploadRecruiterCompanyLogo when hasLinkedCompany is true",
      );
    });

    test("3.4. When linked to company, removal triggers removeRecruiterCompanyLogo in page coordinator", () => {
      assert.match(
        profilePage,
        /if\s*\(\s*hasLinkedCompany\s*\)\s*\{[\s\S]*?removeRecruiterCompanyLogo\(\)/,
        "Page must route removal to removeRecruiterCompanyLogo when hasLinkedCompany is true",
      );
    });

    test("3.5. Company logo removal shows confirmation dialog warning that it affects shared company image", () => {
      assert.match(overview, /Remove company logo\?/);
      assert.match(
        overview,
        /affects the shared company image for all recruiters associated with this company/,
      );
      assert.match(overview, /Yes, remove logo/);
    });
  });

  // ─── 4. Individual Recruiter (No Company) Display & Management ───────────────
  describe("4. Individual Recruiter (No Company) Display & Management", () => {
    test("4.1. When no company, overview fetches personal avatar via fetchRecruiterAvatarBlob", () => {
      assert.match(
        overview,
        /fetchRecruiterAvatarBlob/,
        "Overview must call fetchRecruiterAvatarBlob when no company is linked",
      );
    });

    test("4.2. When no company, overview displays UserIcon placeholder when no avatar is saved", () => {
      assert.match(
        overview,
        /<UserIcon/,
        "Overview must render UserIcon when recruiter has no company and no avatar",
      );
    });

    test("4.3. When no company, upload triggers uploadRecruiterAvatar in page coordinator", () => {
      assert.match(
        profilePage,
        /else\s*\{[\s\S]*?uploadRecruiterAvatar\(file\)/,
        "Page must route upload to uploadRecruiterAvatar when hasLinkedCompany is false",
      );
    });

    test("4.4. When no company, removal triggers removeRecruiterAvatar in page coordinator", () => {
      assert.match(
        profilePage,
        /else\s*\{[\s\S]*?removeRecruiterAvatar\(\)/,
        "Page must route removal to removeRecruiterAvatar when hasLinkedCompany is false",
      );
    });

    test("4.5. Personal avatar removal shows avatar-specific confirmation dialog", () => {
      assert.match(overview, /Remove profile photo\?/);
      assert.match(
        overview,
        /Removing your photo will restore the default avatar\./,
      );
      assert.match(overview, /Yes, remove photo/);
    });
  });

  // ─── 5. Removal of Duplicate Upload Controls from RecruiterCompanyCard ───────
  describe("5. Removal of Duplicate Upload Controls from RecruiterCompanyCard", () => {
    test("5.1. RecruiterCompanyCard does NOT contain a file input", () => {
      assert.doesNotMatch(
        companyCard,
        /<input[^>]*type=["']file["']/,
        "RecruiterCompanyCard must NOT contain any file input",
      );
    });

    test("5.2. RecruiterCompanyCard does NOT contain a Camera upload button", () => {
      assert.doesNotMatch(
        companyCard,
        /Camera/,
        "RecruiterCompanyCard must NOT import or render Camera icon",
      );
      assert.doesNotMatch(
        companyCard,
        /handleTriggerLogoUpload/,
        "RecruiterCompanyCard must NOT have logo upload triggers",
      );
    });

    test("5.3. RecruiterCompanyCard does NOT call uploadRecruiterCompanyLogo or validateLogoFile", () => {
      assert.doesNotMatch(
        companyCard,
        /uploadRecruiterCompanyLogo/,
        "RecruiterCompanyCard must NOT import or call uploadRecruiterCompanyLogo",
      );
      assert.doesNotMatch(
        companyCard,
        /validateLogoFile/,
        "RecruiterCompanyCard must NOT import or call validateLogoFile",
      );
    });

    test("5.4. RecruiterCompanyCard retains logo preview and Building2 fallback", () => {
      assert.match(
        companyCard,
        /Building2/,
        "RecruiterCompanyCard must retain Building2 icon for company branding",
      );
      assert.match(
        companyCard,
        /fetchRecruiterCompanyLogoBlob/,
        "RecruiterCompanyCard must retain logo display preview",
      );
    });
  });

  // ─── 6. Loading and Error Guard Invariants ───────────────────────────────────
  describe("6. Loading and Error Guard Invariants", () => {
    test("6.1. hasLinkedCompany requires !isLoadingProfile and !profileError", () => {
      assert.match(
        profilePage,
        /const\s+hasLinkedCompany\s*=\s*Boolean\(\s*!isLoadingProfile\s*&&\s*!profileError\s*&&\s*company/,
        "hasLinkedCompany must guard against loading and error states",
      );
    });

    test("6.2. Profile page guards upload and removal against in-flight loading or error", () => {
      assert.match(
        profilePage,
        /if\s*\(\s*isLoadingProfile\s*\|\|\s*profileError\s*\)\s*return;/,
        "handleUploadProfileImage must abort if profile is loading or errored",
      );
      assert.match(
        profilePage,
        /if\s*\(\s*isLoadingProfile\s*\|\|\s*profileError\s*\)\s*return;/,
        "handleRemoveProfileImage must abort if profile is loading or errored",
      );
    });

    test("6.3. RecruiterProfileOverview disables actions while loading company or on company error", () => {
      assert.match(
        overview,
        /disabled=\{\s*isUploading\s*\|\|\s*removing\s*\|\|\s*isLoadingCompany\s*\|\|\s*Boolean\(companyError\)\s*\}/,
        "Camera button must be disabled when isLoadingCompany or companyError is set",
      );
      assert.match(
        overview,
        /if\s*\(\s*isUploading\s*\|\|\s*removing\s*\|\|\s*isLoadingCompany\s*\|\|\s*Boolean\(companyError\)\s*\)\s*\{\s*return;\s*\}/,
        "Trigger upload must guard against loading company or company error",
      );
    });
  });

  // ─── 7. Object URL Lifecycle, Revocation, and Cleanup ─────────────────────────
  describe("7. Object URL Lifecycle, Revocation, and Cleanup", () => {
    test("7.1. RecruiterProfileOverview creates object URLs with URL.createObjectURL", () => {
      assert.match(
        overview,
        /URL\.createObjectURL\(blob\)/,
        "Must create object URL for fetched blob",
      );
    });

    test("7.2. RecruiterProfileOverview revokes previous URL on image load", () => {
      assert.match(
        overview,
        /const\s+handleImageLoad\s*=\s*\(\)\s*=>\s*\{[\s\S]*?URL\.revokeObjectURL/,
        "Must revoke previous object URL on image load event",
      );
    });

    test("7.3. RecruiterProfileOverview cleans up active and previous URLs on unmount", () => {
      assert.match(
        overview,
        /useEffect\(\(\)\s*=>\s*\{[\s\S]*?return\s*\(\)\s*=>\s*\{[\s\S]*?URL\.revokeObjectURL/,
        "Must revoke object URLs on unmount",
      );
    });

    test("7.4. RecruiterProfileOverview safely clears object URLs upon confirmed removal", () => {
      assert.match(
        overview,
        /setRemovedImageUrl\(activeImageUrl/,
        "Must mark active image as removed",
      );
      assert.match(
        overview,
        /URL\.revokeObjectURL\(imageObjectUrlRef\.current\)/,
        "Must revoke active image object URL upon removal",
      );
    });
  });

  // ─── 8. Version Synchronization via Custom Events ────────────────────────────
  describe("8. Version Synchronization via Custom Events", () => {
    test("8.1. Overview listens to gigly:recruiter-avatar-version-updated and gigly:recruiter-company-logo-version-updated", () => {
      assert.match(
        overview,
        /gigly:recruiter-avatar-version-updated/,
        "Overview must listen to avatar version updates",
      );
      assert.match(
        overview,
        /gigly:recruiter-company-logo-version-updated/,
        "Overview must listen to company logo version updates",
      );
    });

    test("8.2. Profile page listens to gigly:recruiter-avatar-version-updated and gigly:recruiter-company-logo-version-updated", () => {
      assert.match(
        profilePage,
        /gigly:recruiter-avatar-version-updated/,
        "Profile page must listen to avatar version updates",
      );
      assert.match(
        profilePage,
        /gigly:recruiter-company-logo-version-updated/,
        "Profile page must listen to company logo version updates",
      );
    });

    test("8.3. Upload and remove dispatch version update events", () => {
      assert.match(
        recruiterApi,
        /window\.dispatchEvent\(\s*new CustomEvent\("gigly:recruiter-avatar-version-updated"/,
      );
      assert.match(
        recruiterApi,
        /window\.dispatchEvent\(\s*new CustomEvent\("gigly:recruiter-company-logo-version-updated"/,
      );
    });
  });

  // ─── 9. Recruiter Sidebar Unified Image Behavior ─────────────────────────────
  describe("9. Recruiter Sidebar Unified Image Behavior", () => {
    test("9.1. RecruiterSidebar accepts optional company prop", () => {
      assert.match(
        sidebar,
        /company\?:\s*Company\s*\|\s*null/,
        "RecruiterSidebarProps must accept optional company prop",
      );
    });

    test("9.2. RecruiterProfile passes company to RecruiterSidebar", () => {
      assert.match(
        profilePage,
        /<RecruiterSidebar[^>]*company=\{company\}/,
        "RecruiterProfile must pass company prop to RecruiterSidebar",
      );
    });

    test("9.3. RecruiterSidebar fetches company logo when recruiter is linked to company", () => {
      assert.match(
        sidebar,
        /fetchRecruiterCompanyLogoBlob/,
        "RecruiterSidebar must import and call fetchRecruiterCompanyLogoBlob",
      );
      assert.match(
        sidebar,
        /hasLinkedCompany\s*\?\s*await\s+fetchRecruiterCompanyLogoBlob/,
        "RecruiterSidebar must fetch company logo when hasLinkedCompany is true",
      );
    });

    test("9.4. RecruiterSidebar renders Building2 fallback when recruiter has company but no logo", () => {
      assert.match(
        sidebar,
        /<Building2\s+className=["']w-5\s+h-5\s+text-slate-500["']\s*\/>/,
        "RecruiterSidebar must render Building2 fallback for company-linked recruiters",
      );
    });

    test("9.5. RecruiterSidebar renders personal avatar or User icon for individual recruiters", () => {
      assert.match(
        sidebar,
        /fetchRecruiterAvatarBlob/,
        "RecruiterSidebar must fetch personal avatar when recruiter has no company",
      );
      assert.match(
        sidebar,
        /<User\s+className=["']w-5\s+h-5\s+text-slate-500["']\s*\/>/,
        "RecruiterSidebar must render User icon fallback for individual recruiters",
      );
    });

    test("9.6. RecruiterSidebar listens to both avatar and company logo version events", () => {
      assert.match(
        sidebar,
        /gigly:recruiter-avatar-version-updated/,
        "RecruiterSidebar must listen to avatar version updates",
      );
      assert.match(
        sidebar,
        /gigly:recruiter-company-logo-version-updated/,
        "RecruiterSidebar must listen to company logo version updates",
      );
    });
  });

  // ─── 10. Removal State Synchronization & Refresh Failure Tolerance ───────────
  describe("10. Removal State Synchronization & Refresh Failure Tolerance", () => {
    test("10.1. Company logo removal explicitly clears company.logoUrl to null in state", () => {
      assert.match(
        profilePage,
        /setCompany\(\s*\{\s*\.\.\.company,\s*logoUrl:\s*null\s*\}\s*\)/,
        "Page must immediately clear company.logoUrl in state upon successful DELETE",
      );
    });

    test("10.2. Avatar removal absorbs refreshUser() failure so DELETE remains authoritative", () => {
      assert.match(
        profilePage,
        /await\s+removeRecruiterAvatar\(\);\s*try\s*\{\s*await\s+refreshUser\(\);\s*\}\s*catch/,
        "Page must catch refreshUser failure so successful DELETE is not converted to an error",
      );
    });

    test("10.3. RecruiterProfileOverview sets removedImageUrl upon confirmed removal", () => {
      assert.match(
        overview,
        /setRemovedImageUrl\(\s*activeImageUrl\s*\?\?\s*["']["']\s*\)/,
        "Overview must record removed image URL",
      );
    });

    test("10.4. isRemoved guard prevents loadImage from re-fetching or restoring removed image", () => {
      assert.match(
        overview,
        /if\s*\(\s*isRemoved\s*\|\|\s*!activeImageUrl\s*\|\|\s*activeImageUrl\.trim\(\)\s*===\s*["']["']\s*\)/,
        "loadImage must abort when isRemoved is true even if stale activeImageUrl is present",
      );
      assert.match(
        overview,
        /const\s+hasSavedImage\s*=\s*!isRemoved\s*&&/,
        "hasSavedImage must be false when isRemoved is true",
      );
    });
  });
});
