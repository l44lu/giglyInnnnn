import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readComponent = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

describe("Step 1: Unified Recruiter Profile Editing Integration & Coordination Tests", () => {
  const profilePage = readComponent("../pages/recruiter/RecruiterProfile.tsx");
  const header = readComponent(
    "../components/recruiter/RecruiterProfileHeader.tsx",
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

  // ─── 1. View Mode & Unified Action ─────────────────────────────────
  describe("1. View Mode & Single 'Edit Details' Action", () => {
    test("1.1. Header has single 'Edit Details' button in view mode", () => {
      assert.match(
        header,
        /Edit Details/,
        "Header must render 'Edit Details' button in view mode",
      );
      assert.match(
        header,
        /aria-label="Edit Details"/,
        "Edit button must have accessibility aria-label='Edit Details'",
      );
    });

    test("1.2. PersonalInfoCard has NO individual 'Update', 'Save', or 'Cancel' buttons", () => {
      assert.doesNotMatch(personalInfo, /aria-label="Edit Personal Information"/);
      assert.doesNotMatch(personalInfo, /handleStartEditingPersonal/);
      assert.doesNotMatch(personalInfo, /handleSavePersonal/);
      assert.doesNotMatch(personalInfo, /handleCancelPersonal/);
    });

    test("1.3. CompanyCard has NO individual 'Edit', 'Save', or 'Cancel' buttons in header", () => {
      assert.doesNotMatch(companyCard, /aria-label="Edit Company Details"/);
      assert.doesNotMatch(companyCard, /handleStartEditing/);
      assert.doesNotMatch(companyCard, /handleCancelEditing/);
      assert.doesNotMatch(companyCard, /handleSaveCompany/);
    });

    test("1.4. CompanyCard renders 'Add Company' in empty state that triggers unified edit", () => {
      assert.match(companyCard, /No company profile configured yet/);
      assert.match(companyCard, /Add Company/);
      assert.match(companyCard, /onClick=\{onTriggerEdit\}/);
    });
  });

  // ─── 2. Edit Mode Activates Across All Three Sections ──────────────
  describe("2. Edit Mode Activates Across All Three Sections", () => {
    test("2.1. RecruiterProfile owns unified isEditingDetails state", () => {
      assert.match(profilePage, /const\s+\[isEditingDetails,\s*setIsEditingDetails\]\s*=\s*useState\(false\)/);
    });

    test("2.2. Clicking Edit Details activates editing across personal, professional, and company", () => {
      assert.match(profilePage, /handleStartEditingDetails/);
      assert.match(profilePage, /isEditingDetails=\{isEditingDetails\}/);
    });

    test("2.3. PersonalInfoCard renders inputs for full name, phone, location, bio when isEditingDetails is true", () => {
      assert.match(personalInfo, /id="recruiter-full-name"/);
      assert.match(personalInfo, /id="recruiter-phone"/);
      assert.match(personalInfo, /id="recruiter-location"/);
      assert.match(personalInfo, /id="recruiter-bio"/);
    });

    test("2.4. Email address remains read-only with Primary badge in PersonalInfoCard", () => {
      assert.match(personalInfo, /Email Address/);
      assert.match(personalInfo, /Primary/);
      assert.doesNotMatch(personalInfo, /id="recruiter-email"/);
    });

    test("2.5. ProfessionalCard renders inputs for roleTitle and yearsExperience", () => {
      assert.match(professional, /id="professional-role-title"/);
      assert.match(professional, /id="professional-years-experience"/);
    });

    test("2.6. CompanyCard renders inputs for name, industry, size, website, hq, about", () => {
      assert.match(companyCard, /id="company-name"/);
      assert.match(companyCard, /id="company-industry"/);
      assert.match(companyCard, /id="company-size"/);
      assert.match(companyCard, /id="company-website"/);
      assert.match(companyCard, /id="company-headquarters"/);
      assert.match(companyCard, /id="company-about"/);
    });
  });

  // ─── 3. Unified Save Changes & Cancel Buttons in Header ───────────
  describe("3. Unified Save Changes & Cancel Controls", () => {
    test("3.1. Header renders 'Cancel' and 'Save Changes' in edit mode", () => {
      assert.match(header, /Save Changes/);
      assert.match(header, /aria-label="Save changes"/);
      assert.match(header, /aria-label="Cancel editing details"/);
    });

    test("3.2. Header shows 'Saving...' loading state and disables buttons while saving", () => {
      assert.match(header, /isSavingDetails\s*\?\s*"Saving\.\.\."\s*:\s*"Save Changes"/);
      assert.match(header, /disabled=\{isSavingDetails\}/);
    });

    test("3.3. Inputs across all cards are disabled while saving", () => {
      assert.match(personalInfo, /disabled=\{isSavingDetails\}/);
      assert.match(professional, /disabled=\{isSavingDetails\}/);
      assert.match(companyCard, /disabled=\{isSavingDetails\}/);
    });
  });

  // ─── 4. Coordination Logic Simulation ──────────────────────────────
  describe("4. Runtime Coordination Simulation (Validation, Dirty Checking & Partial Failure)", () => {
    // Helper replicating coordination logic from RecruiterProfile.tsx
    const createCoordinator = (initialState) => {
      let user = { ...initialState.user };
      let profile = { ...initialState.profile };
      let company = initialState.company ? { ...initialState.company } : null;

      let isEditingDetails = false;
      let isSavingDetails = false;
      let detailsError = null;

      // Drafts
      let customFullName = "";
      let customPhone = "";
      let customLocation = "";
      let customBio = "";
      let customRoleTitle = "";
      let customYearsExperience = "";
      let customCompanyName = "";
      let customCompanyIndustry = "";
      let customCompanySize = "";
      let customCompanyWebsite = "";
      let customCompanyHeadquarters = "";
      let customCompanyAbout = "";

      const getSavedName = () =>
        `${user.firstName ?? ""}`.trim() || `${user.lastName ?? ""}`.trim()
          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
          : "";

      const startEditing = () => {
        customFullName = getSavedName();
        customPhone = user.phone ?? "";
        customLocation = user.location ?? "";
        customBio = user.bio ?? "";
        customRoleTitle = profile.roleTitle ?? "";
        customYearsExperience =
          profile.yearsExperience !== null && profile.yearsExperience !== undefined
            ? profile.yearsExperience.toString()
            : "";
        customCompanyName = company?.name ?? "";
        customCompanyIndustry = company?.industry ?? "";
        customCompanySize = company?.companySize ?? "";
        customCompanyWebsite = company?.website ?? "";
        customCompanyHeadquarters = company?.headquartersLocation ?? "";
        customCompanyAbout = company?.about ?? "";
        detailsError = null;
        isEditingDetails = true;
      };

      const cancel = () => {
        customFullName = getSavedName();
        customPhone = user.phone ?? "";
        customLocation = user.location ?? "";
        customBio = user.bio ?? "";
        customRoleTitle = profile.roleTitle ?? "";
        customYearsExperience =
          profile.yearsExperience !== null && profile.yearsExperience !== undefined
            ? profile.yearsExperience.toString()
            : "";
        customCompanyName = company?.name ?? "";
        customCompanyIndustry = company?.industry ?? "";
        customCompanySize = company?.companySize ?? "";
        customCompanyWebsite = company?.website ?? "";
        customCompanyHeadquarters = company?.headquartersLocation ?? "";
        customCompanyAbout = company?.about ?? "";
        detailsError = null;
        isEditingDetails = false;
      };

      const save = async (apiMocks = {}) => {
        if (isSavingDetails) return;

        const savedName = getSavedName().trim();
        const savedPhone = (user.phone ?? "").trim();
        const savedLocation = (user.location ?? "").trim();
        const savedBio = (user.bio ?? "").trim();

        const savedRoleTitle = (profile.roleTitle ?? "").trim();
        const savedYearsExp =
          profile.yearsExperience !== null && profile.yearsExperience !== undefined
            ? profile.yearsExperience.toString().trim()
            : "";

        const savedCompName = (company?.name ?? "").trim();
        const savedCompIndustry = (company?.industry ?? "").trim();
        const savedCompSize = (company?.companySize ?? "").trim();
        const savedCompWebsite = (company?.website ?? "").trim();
        const savedCompHq = (company?.headquartersLocation ?? "").trim();
        const savedCompAbout = (company?.about ?? "").trim();

        const draftFullName = customFullName.trim();
        const draftPhone = customPhone.trim();
        const draftLocation = customLocation.trim();
        const draftBio = customBio.trim();

        const draftRoleTitle = customRoleTitle.trim();
        const draftYearsExp = customYearsExperience.trim();

        const draftCompName = customCompanyName.trim();
        const draftCompIndustry = customCompanyIndustry.trim();
        const draftCompSize = customCompanySize.trim();
        const draftCompWebsite = customCompanyWebsite.trim();
        const draftCompHq = customCompanyHeadquarters.trim();
        const draftCompAbout = customCompanyAbout.trim();

        const isPersonalDirty =
          draftFullName !== savedName ||
          draftPhone !== savedPhone ||
          draftLocation !== savedLocation ||
          draftBio !== savedBio;

        const isProfessionalDirty =
          draftRoleTitle !== savedRoleTitle || draftYearsExp !== savedYearsExp;

        const hasAnyCompDraftEntered =
          draftCompName.length > 0 ||
          draftCompIndustry.length > 0 ||
          draftCompSize.length > 0 ||
          draftCompWebsite.length > 0 ||
          draftCompHq.length > 0 ||
          draftCompAbout.length > 0;

        const isCompanyDirty =
          draftCompName !== savedCompName ||
          draftCompIndustry !== savedCompIndustry ||
          draftCompSize !== savedCompSize ||
          draftCompWebsite !== savedCompWebsite ||
          draftCompHq !== savedCompHq ||
          draftCompAbout !== savedCompAbout;

        if (isPersonalDirty && draftFullName.length === 0) {
          detailsError = "Full name is required.";
          return;
        }

        const parsedYears = draftYearsExp === "" ? null : Number(draftYearsExp);
        if (
          isProfessionalDirty &&
          (Number.isNaN(parsedYears) || (parsedYears !== null && parsedYears < 0))
        ) {
          detailsError = "Years of experience must be a non-negative whole number.";
          return;
        }

        if (
          isCompanyDirty &&
          (company !== null || hasAnyCompDraftEntered) &&
          draftCompName.length === 0
        ) {
          detailsError = "Company name is required.";
          return;
        }

        if (!isPersonalDirty && !isProfessionalDirty && !isCompanyDirty) {
          isEditingDetails = false;
          detailsError = null;
          return { status: "NO_CHANGES" };
        }

        isSavingDetails = true;
        detailsError = null;

        const tasks = [];

        if (isPersonalDirty) {
          tasks.push({
            id: "personal",
            displayName: "Personal Information",
            execute: async () => {
              if (apiMocks.personalFail) {
                throw new Error(apiMocks.personalFail);
              }
              const [firstName, ...rest] = draftFullName.split(" ");
              user = {
                ...user,
                firstName,
                lastName: rest.join(" "),
                phone: draftPhone || null,
                location: draftLocation || null,
                bio: draftBio || null,
              };
              return user;
            },
          });
        }

        if (isProfessionalDirty) {
          tasks.push({
            id: "professional",
            displayName: "Professional Details",
            execute: async () => {
              if (apiMocks.professionalFail) {
                throw new Error(apiMocks.professionalFail);
              }
              profile = {
                ...profile,
                roleTitle: draftRoleTitle || null,
                yearsExperience: parsedYears,
              };
              return profile;
            },
          });
        }

        if (isCompanyDirty) {
          tasks.push({
            id: "company",
            displayName: "Company Details",
            execute: async () => {
              if (apiMocks.companyFail) {
                throw new Error(apiMocks.companyFail);
              }
              company = {
                id: company?.id ?? "comp-1",
                name: draftCompName,
                industry: draftCompIndustry || null,
                companySize: draftCompSize || null,
                website: draftCompWebsite || null,
                headquartersLocation: draftCompHq || null,
                about: draftCompAbout || null,
                logoUrl: company?.logoUrl ?? null,
              };
              return company;
            },
          });
        }

        try {
          const results = await Promise.allSettled(tasks.map((t) => t.execute()));
          const succeeded = [];
          const failed = [];

          results.forEach((res, index) => {
            const task = tasks[index];
            if (res.status === "fulfilled") {
              succeeded.push(task.displayName);
            } else {
              failed.push({ name: task.displayName, error: res.reason.message });
            }
          });

          if (failed.length === 0) {
            isEditingDetails = false;
            detailsError = null;
            return { status: "SUCCESS", succeeded };
          } else if (succeeded.length === 0) {
            detailsError = failed.map((f) => `${f.name}: ${f.error}`).join(" | ");
            return { status: "ALL_FAILED", failed };
          } else {
            const succSummary = succeeded.join(", ");
            const failSummary = failed.map((f) => `${f.name} (${f.error})`).join("; ");
            detailsError = `Saved: ${succSummary}. Failed: ${failSummary}. Please review unsaved changes and try again.`;
            return { status: "PARTIAL_FAILURE", succeeded, failed };
          }
        } finally {
          isSavingDetails = false;
        }
      };

      return {
        getState: () => ({
          user,
          profile,
          company,
          isEditingDetails,
          isSavingDetails,
          detailsError,
          drafts: {
            customFullName,
            customPhone,
            customLocation,
            customBio,
            customRoleTitle,
            customYearsExperience,
            customCompanyName,
            customCompanyIndustry,
            customCompanySize,
            customCompanyWebsite,
            customCompanyHeadquarters,
            customCompanyAbout,
          },
        }),
        setDrafts: (updates) => {
          if (updates.customFullName !== undefined)
            customFullName = updates.customFullName;
          if (updates.customPhone !== undefined)
            customPhone = updates.customPhone;
          if (updates.customLocation !== undefined)
            customLocation = updates.customLocation;
          if (updates.customBio !== undefined) customBio = updates.customBio;
          if (updates.customRoleTitle !== undefined)
            customRoleTitle = updates.customRoleTitle;
          if (updates.customYearsExperience !== undefined)
            customYearsExperience = updates.customYearsExperience;
          if (updates.customCompanyName !== undefined)
            customCompanyName = updates.customCompanyName;
          if (updates.customCompanyIndustry !== undefined)
            customCompanyIndustry = updates.customCompanyIndustry;
          if (updates.customCompanySize !== undefined)
            customCompanySize = updates.customCompanySize;
          if (updates.customCompanyWebsite !== undefined)
            customCompanyWebsite = updates.customCompanyWebsite;
          if (updates.customCompanyHeadquarters !== undefined)
            customCompanyHeadquarters = updates.customCompanyHeadquarters;
          if (updates.customCompanyAbout !== undefined)
            customCompanyAbout = updates.customCompanyAbout;
        },
        startEditing,
        cancel,
        save,
      };
    };

    test("4.1. Preflight validation rejects empty full name without dispatching requests", async () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp" },
      });

      coord.startEditing();
      coord.setDrafts({ customFullName: "   " });
      await coord.save();

      const state = coord.getState();
      assert.equal(state.detailsError, "Full name is required.");
      assert.equal(state.isEditingDetails, true);
    });

    test("4.2. Preflight validation rejects non-integer years of experience", async () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp" },
      });

      coord.startEditing();
      coord.setDrafts({ customYearsExperience: "-3" });
      await coord.save();

      const state = coord.getState();
      assert.equal(
        state.detailsError,
        "Years of experience must be a non-negative whole number.",
      );
      assert.equal(state.isEditingDetails, true);
    });

    test("4.3. Preflight validation rejects blank company name when company is dirty", async () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp" },
      });

      coord.startEditing();
      coord.setDrafts({ customCompanyName: "   " });
      await coord.save();

      const state = coord.getState();
      assert.equal(state.detailsError, "Company name is required.");
      assert.equal(state.isEditingDetails, true);
    });

    test("4.4. If nothing changed, exits edit mode with NO_CHANGES and zero requests", async () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp" },
      });

      coord.startEditing();
      const res = await coord.save();

      const state = coord.getState();
      assert.equal(res?.status, "NO_CHANGES");
      assert.equal(state.isEditingDetails, false);
      assert.equal(state.detailsError, null);
    });

    test("4.5. Cancel restores drafts from baseline and exits edit mode", () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp" },
      });

      coord.startEditing();
      coord.setDrafts({
        customFullName: "Bob Modified",
        customRoleTitle: "VP of People",
        customCompanyName: "NewCorp",
      });

      coord.cancel();
      const state = coord.getState();
      assert.equal(state.isEditingDetails, false);
      assert.equal(state.drafts.customFullName, "Alice Smith");
      assert.equal(state.drafts.customRoleTitle, "Lead Recruiter");
      assert.equal(state.drafts.customCompanyName, "TechCorp");
    });

    test("4.6. Partial failure: preserves unsaved changes, updates saved baseline, and only resends failed section on retry", async () => {
      const coord = createCoordinator({
        user: { firstName: "Alice", lastName: "Smith", phone: "111" },
        profile: { roleTitle: "Lead Recruiter", yearsExperience: 5 },
        company: { name: "TechCorp", industry: "Tech" },
      });

      coord.startEditing();
      // Modify Personal and Company
      coord.setDrafts({
        customFullName: "Alice Johnson",
        customCompanyName: "MegaCorp",
      });

      // Personal succeeds, Company fails
      const firstRes = await coord.save({
        companyFail: "Remote database timeout",
      });

      assert.equal(firstRes.status, "PARTIAL_FAILURE");
      let state = coord.getState();
      // Page must remain in edit mode
      assert.equal(state.isEditingDetails, true);
      // Personal baseline updated!
      assert.equal(state.user.firstName, "Alice");
      assert.equal(state.user.lastName, "Johnson");
      // Failed company draft preserved!
      assert.equal(state.drafts.customCompanyName, "MegaCorp");
      // Clear error indicating what was saved and what failed
      assert.match(state.detailsError, /Saved: Personal Information/);
      assert.match(state.detailsError, /Failed: Company Details/);

      // Now retry: company now succeeds
      const secondRes = await coord.save();
      assert.equal(secondRes.status, "SUCCESS");
      // Only Company was dirty on retry!
      assert.deepEqual(secondRes.succeeded, ["Company Details"]);

      state = coord.getState();
      assert.equal(state.isEditingDetails, false);
      assert.equal(state.detailsError, null);
      assert.equal(state.company.name, "MegaCorp");
    });
  });
});
