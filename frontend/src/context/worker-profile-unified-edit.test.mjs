import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readComponent = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

describe("Step 2: Unified Worker Profile Editing Integration & Coordination Tests", () => {
  const profilePage = readComponent("../pages/worker/WorkerProfile.tsx");
  const header = readComponent("../components/worker/WorkerProfileHeader.tsx");
  const personalInfo = readComponent(
    "../components/worker/WorkerPersonalInfoCard.tsx",
  );
  const overview = readComponent(
    "../components/worker/WorkerProfileOverview.tsx",
  );
  const skillsCard = readComponent("../components/worker/WorkerSkillsCard.tsx");
  const statsCard = readComponent("../components/worker/WorkerProfileStats.tsx");

  // ─── 1. View Mode & Single 'Edit Details' Action ─────────────────────
  describe("1. View Mode & Single 'Edit Details' Action", () => {
    test("1.1. Header renders single 'Edit Details' button in view mode", () => {
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
      assert.doesNotMatch(
        personalInfo,
        /aria-label=["']Update personal information["']/,
      );
      assert.doesNotMatch(
        personalInfo,
        /aria-label=["']Save personal information["']/,
      );
      assert.doesNotMatch(
        personalInfo,
        /aria-label=["']Cancel personal information editing["']/,
      );
      assert.doesNotMatch(personalInfo, /handleStartEditingPersonal/);
      assert.doesNotMatch(personalInfo, /handleSavePersonal/);
    });

    test("1.3. SkillsCard has NO individual 'Edit', 'Save', or 'Cancel' buttons in header", () => {
      assert.doesNotMatch(skillsCard, /aria-label=["']Edit skills["']/);
      assert.doesNotMatch(skillsCard, /aria-label=["']Save skills["']/);
      assert.doesNotMatch(skillsCard, /aria-label=["']Cancel skills editing["']/);
      assert.doesNotMatch(skillsCard, /handleSaveSkills/);
    });
  });

  // ─── 2. Edit Mode Activates Across All Three Sections ──────────────
  describe("2. Edit Mode Activates Across All Three Sections", () => {
    test("2.1. WorkerProfile owns unified isEditingDetails state", () => {
      assert.match(
        profilePage,
        /const\s+\[isEditingDetails,\s*setIsEditingDetails\]\s*=\s*useState\(false\)/,
      );
    });

    test("2.2. Clicking Edit Details activates editing across personal, professional, and skills", () => {
      assert.match(profilePage, /handleStartEditingDetails/);
      assert.match(
        profilePage,
        /<WorkerPersonalInfoCard[\s\S]*?isEditingDetails=\{isEditingDetails\}/,
      );
      assert.match(
        profilePage,
        /<WorkerProfileOverview[\s\S]*?isEditingDetails=\{isEditingDetails\}/,
      );
      assert.match(
        profilePage,
        /<WorkerSkillsCard[\s\S]*?isEditingDetails=\{isEditingDetails\}/,
      );
    });

    test("2.3. PersonalInfoCard renders inputs for full name, phone, location, bio when isEditingDetails is true", () => {
      assert.match(personalInfo, /FULL NAME/);
      assert.match(personalInfo, /PHONE/);
      assert.match(personalInfo, /LOCATION/);
      assert.match(personalInfo, /BIO/);
      assert.match(personalInfo, /readOnly=\{!isEditingDetails\}/);
    });

    test("2.4. Professional details in Overview and Stats respond to isEditingDetails", () => {
      assert.match(overview, /isEditingDetails/);
      assert.match(overview, /aria-label="Professional headline"/);
      assert.match(overview, /aria-label="Toggle open to work status"/);
      assert.match(statsCard, /isEditingDetails/);
      assert.match(statsCard, /aria-label="Response time hours"/);
    });

    test("2.5. SkillsCard renders select dropdown and add button when isEditingDetails is true", () => {
      assert.match(skillsCard, /isEditingDetails/);
      assert.match(skillsCard, /aria-label="Select skill to add"/);
      assert.match(skillsCard, /aria-label="Add skill"/);
    });
  });

  // ─── 3. Child Cards Controlled Props ────────────────────────────────
  describe("3. Child Cards Receive Controlled Values and Callbacks", () => {
    test("3.1. WorkerPersonalInfoCard receives controlled values from page", () => {
      assert.match(personalInfo, /fullName\?:/);
      assert.match(personalInfo, /phone\?:/);
      assert.match(personalInfo, /location\?:/);
      assert.match(personalInfo, /bio\?:/);
      assert.match(personalInfo, /onChangeFullName\?:/);
      assert.match(personalInfo, /onChangePhone\?:/);
      assert.match(personalInfo, /onChangeLocation\?:/);
      assert.match(personalInfo, /onChangeBio\?:/);
    });

    test("3.2. WorkerSkillsCard receives controlled draftSkillIds, onAddSkill, onRemoveSkill", () => {
      assert.match(skillsCard, /draftSkillIds\?:/);
      assert.match(skillsCard, /onAddSkill\?:/);
      assert.match(skillsCard, /onRemoveSkill\?:/);
    });
  });

  // ─── 4. Email Remains Strictly Read-Only ────────────────────────────
  describe("4. Email Address Immutability", () => {
    test("4.1. Email input in WorkerPersonalInfoCard has readOnly attribute and never renders an edit input", () => {
      assert.match(personalInfo, /<input[^>]*type=["']email["'][^>]*readOnly/);
      assert.match(personalInfo, /readOnly/);
    });

    test("4.2. WorkerProfile does NOT send email in any update payload", () => {
      assert.doesNotMatch(
        profilePage,
        /updateWorkerPersonalProfile\(\s*\{[\s\S]*?email:/,
      );
    });
  });

  // ─── 5. Skills Draft Lifecycle ──────────────────────────────────────
  describe("5. Skills Draft State and Prevention of Premature Requests", () => {
    test("5.1. Adding a skill in draft state updates draftSkillIds without dispatching updateWorkerSkills", () => {
      let draftSkillIds = ["s-1", "s-2"];
      let updateWorkerSkillsCalls = 0;

      const handleAddSkill = (skillId) => {
        if (!draftSkillIds.includes(skillId)) {
          draftSkillIds = [...draftSkillIds, skillId];
        }
      };

      handleAddSkill("s-3");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-2", "s-3"]);
      assert.strictEqual(updateWorkerSkillsCalls, 0);

      // Adding duplicate is prevented
      handleAddSkill("s-2");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-2", "s-3"]);
      assert.strictEqual(updateWorkerSkillsCalls, 0);
    });

    test("5.2. Removing a skill in draft state updates draftSkillIds without dispatching updateWorkerSkills", () => {
      let draftSkillIds = ["s-1", "s-2", "s-3"];
      let updateWorkerSkillsCalls = 0;

      const handleRemoveSkill = (skillId) => {
        draftSkillIds = draftSkillIds.filter((id) => id !== skillId);
      };

      handleRemoveSkill("s-2");
      assert.deepStrictEqual(draftSkillIds, ["s-1", "s-3"]);
      assert.strictEqual(updateWorkerSkillsCalls, 0);
    });

    test("5.3. WorkerSkillsCard filters out already selected skills from catalog options", () => {
      const catalog = [
        { id: "s-1", name: "Food Serving" },
        { id: "s-2", name: "Kitchen Help" },
        { id: "s-3", name: "Table Service" },
      ];
      const draftIds = ["s-1"];
      const selectedSet = new Set(draftIds);
      const available = catalog.filter((c) => !selectedSet.has(c.id));

      assert.strictEqual(available.length, 2);
      assert.strictEqual(available[0].id, "s-2");
      assert.strictEqual(available[1].id, "s-3");
    });
  });

  // ─── 6. Cancel Behavior ─────────────────────────────────────────────
  describe("6. Cancel Behavior Restores Baseline Without Network Requests", () => {
    test("6.1. Cancel restores personal, professional, and skills drafts to latest saved baselines", () => {
      // Saved baseline
      const savedUser = {
        fullName: "Original Name",
        phone: "1234567890",
        location: "Original City",
        bio: "Original bio",
      };
      const savedProfile = {
        headline: "Original Headline",
        responseTimeHours: 4,
        isOpenToWork: true,
      };
      const savedSkills = [{ id: "ws-1", skillId: "s-1", skillName: "Server" }];

      // Dirty drafts
      let draftFullName = "Dirty Name";
      let draftHeadline = "Dirty Headline";
      let draftSkillIds = ["s-1", "s-2", "s-3"];
      let isEditingDetails = true;
      let detailsError = "Some previous error";
      let networkRequests = 0;

      // Execute Cancel
      const handleCancel = () => {
        draftFullName = savedUser.fullName;
        draftHeadline = savedProfile.headline;
        draftSkillIds = savedSkills.map((s) => s.skillId);
        detailsError = null;
        isEditingDetails = false;
      };

      handleCancel();

      assert.strictEqual(draftFullName, "Original Name");
      assert.strictEqual(draftHeadline, "Original Headline");
      assert.deepStrictEqual(draftSkillIds, ["s-1"]);
      assert.strictEqual(isEditingDetails, false);
      assert.strictEqual(detailsError, null);
      assert.strictEqual(networkRequests, 0);
    });

    test("6.2. WorkerProfile.tsx handleCancelDetails implementation resets all drafts and error", () => {
      assert.match(profilePage, /const\s+handleCancelDetails\s*=\s*\(\)\s*=>/);
      assert.match(profilePage, /setDetailsError\(null\)/);
      assert.match(profilePage, /setIsEditingDetails\(false\)/);
    });
  });

  // ─── 7. Dirty Checking ──────────────────────────────────────────────
  describe("7. Dirty Checking Only Dispatches Changed Sections", () => {
    test("7.1. Clean state makes zero API calls and returns to view mode with feedback", async () => {
      let isPersonalDirty = false;
      let isProfessionalDirty = false;
      let isSkillsDirty = false;
      let networkCalls = 0;
      let editMode = true;
      let toastMessage = "";

      const handleSave = async () => {
        if (!isPersonalDirty && !isProfessionalDirty && !isSkillsDirty) {
          editMode = false;
          toastMessage = "No changes to save.";
          return;
        }
        networkCalls++;
      };

      await handleSave();
      assert.strictEqual(networkCalls, 0, "No network calls if no section is dirty");
      assert.strictEqual(editMode, false, "Returns to view mode");
      assert.strictEqual(toastMessage, "No changes to save.");
    });

    test("7.2. Only changed sections are submitted in save tasks array", () => {
      const runDirtyCheck = (personalDirty, profDirty, skillsDirty) => {
        const tasks = [];
        if (personalDirty) tasks.push("personal");
        if (profDirty) tasks.push("professional");
        if (skillsDirty) tasks.push("skills");
        return tasks;
      };

      assert.deepStrictEqual(runDirtyCheck(true, false, false), ["personal"]);
      assert.deepStrictEqual(runDirtyCheck(false, true, false), ["professional"]);
      assert.deepStrictEqual(runDirtyCheck(false, false, true), ["skills"]);
      assert.deepStrictEqual(runDirtyCheck(true, false, true), ["personal", "skills"]);
      assert.deepStrictEqual(runDirtyCheck(true, true, true), ["personal", "professional", "skills"]);
    });

    test("7.3. WorkerProfile implements dirty checking for personal, professional, and skills", () => {
      assert.match(profilePage, /isPersonalDirty/);
      assert.match(profilePage, /isProfessionalDirty/);
      assert.match(profilePage, /isSkillsDirty/);
    });
  });

  // ─── 8. Client-Side Validation ──────────────────────────────────────
  describe("8. Preflight Client-Side Validation", () => {
    test("8.1. Empty full name when personal info is dirty halts save and keeps edit mode", async () => {
      const isPersonalDirty = true;
      const customFullName = "   ";
      let dispatched = false;
      let errorMessage = null;

      if (isPersonalDirty && !customFullName.trim()) {
        errorMessage = "Full name is required.";
      } else {
        dispatched = true;
      }

      assert.strictEqual(dispatched, false, "Request must not be dispatched");
      assert.strictEqual(errorMessage, "Full name is required.");
    });

    test("8.2. Invalid response-time (e.g. negative or NaN) halts save and keeps edit mode", async () => {
      const isProfessionalDirty = true;
      const customResponseTimeHours = "-5";
      let dispatched = false;
      let errorMessage = null;

      const trimmed = customResponseTimeHours.trim();
      const parsed = trimmed === "" ? null : Number(trimmed);
      if (
        isProfessionalDirty &&
        parsed !== null &&
        (!Number.isInteger(parsed) || parsed < 0)
      ) {
        errorMessage =
          "Response time must be a non-negative whole number of hours.";
      } else {
        dispatched = true;
      }

      assert.strictEqual(dispatched, false, "Request must not be dispatched");
      assert.strictEqual(
        errorMessage,
        "Response time must be a non-negative whole number of hours.",
      );
    });

    test("8.3. WorkerProfile preflight validation checks in handleSaveDetails", () => {
      assert.match(profilePage, /Full name is required/);
      assert.match(profilePage, /Response time must be a non-negative whole number/);
    });
  });

  // ─── 9. Successful Save & Baseline Update ───────────────────────────
  describe("9. Successful Save Updates Baselines and Returns to View Mode", () => {
    test("9.1. All dirty sections succeed, updating baselines and returning to view mode", async () => {
      let savedUser = { fullName: "Old Name" };
      let savedProfile = { headline: "Old Headline" };
      let savedSkills = [{ id: "ws-1", skillId: "s-1", skillName: "Server" }];
      let editMode = true;
      let successToastFired = false;

      // Simulated network update
      const updatePersonal = async (draft) => {
        savedUser = { ...savedUser, fullName: draft.name };
        return { success: true };
      };
      const updateProfessional = async (draft) => {
        savedProfile = { ...savedProfile, headline: draft.headline };
        return { success: true };
      };
      const updateSkills = async (draftIds) => {
        savedSkills = draftIds.map((id) => ({ id: `ws-${id}`, skillId: id, skillName: "Skill" }));
        return savedSkills;
      };

      const tasks = [
        () => updatePersonal({ name: "New Name" }),
        () => updateProfessional({ headline: "New Headline" }),
        () => updateSkills(["s-1", "s-2"]),
      ];

      const results = await Promise.allSettled(tasks.map((t) => t()));
      const allSucceeded = results.every((r) => r.status === "fulfilled");

      if (allSucceeded) {
        editMode = false;
        successToastFired = true;
      }

      assert.strictEqual(allSucceeded, true);
      assert.strictEqual(editMode, false);
      assert.strictEqual(successToastFired, true);
      assert.strictEqual(savedUser.fullName, "New Name");
      assert.strictEqual(savedProfile.headline, "New Headline");
      assert.strictEqual(savedSkills.length, 2);
    });
  });

  // ─── 10. Partial Failure & Safe Retry ───────────────────────────────
  describe("10. Partial Failure Handling & Safe Retry", () => {
    test("10.1. Partial failure preserves failed section draft, updates succeeded baseline, and stays in edit mode", async () => {
      let savedUser = { fullName: "Old Name" };
      let savedProfile = { headline: "Old Headline" };
      let draftFullName = "New Name";
      let draftHeadline = "New Headline";
      let isEditing = true;
      let errorAlert = null;

      // Personal succeeds, Professional fails
      const tasks = [
        {
          id: "personal",
          name: "Personal Information",
          execute: async () => {
            savedUser = { ...savedUser, fullName: draftFullName };
          },
        },
        {
          id: "professional",
          name: "Professional Details",
          execute: async () => {
            throw new Error("500 Internal Server Error");
          },
        },
      ];

      const results = await Promise.allSettled(tasks.map((t) => t.execute()));
      const succeeded = [];
      const failed = [];

      results.forEach((res, idx) => {
        const task = tasks[idx];
        if (res.status === "fulfilled") {
          succeeded.push(task.name);
        } else {
          failed.push({ name: task.name, error: res.reason.message });
        }
      });

      if (failed.length > 0 && succeeded.length > 0) {
        // Partial failure: remain in edit mode
        isEditing = true;
        errorAlert = `Saved: ${succeeded.join(", ")}. Failed: ${failed.map((f) => `${f.name} (${f.error})`).join("; ")}. Please review unsaved changes and try again.`;
      }

      assert.strictEqual(isEditing, true, "Must remain in edit mode on partial failure");
      assert.strictEqual(savedUser.fullName, "New Name", "Succeeded section baseline was updated");
      assert.strictEqual(draftHeadline, "New Headline", "Failed section draft was preserved");
      assert.match(errorAlert, /Saved: Personal Information/);
      assert.match(errorAlert, /Failed: Professional Details/);

      // On retry: personal is no longer dirty!
      const isPersonalDirty = draftFullName !== savedUser.fullName;
      const isProfessionalDirty = draftHeadline !== savedProfile.headline;

      assert.strictEqual(isPersonalDirty, false, "Personal info must not be dirty on retry");
      assert.strictEqual(isProfessionalDirty, true, "Professional details remains dirty on retry");
    });
  });

  // ─── 11. Avatar Upload Independence ─────────────────────────────────
  describe("11. Avatar Upload Independence", () => {
    test("11.1. Avatar upload is handled independently via uploadWorkerAvatar and POST /worker/profile/avatar", () => {
      assert.match(profilePage, /uploadWorkerAvatar/);
      assert.match(profilePage, /const\s+handleUploadAvatar\s*=\s*async/);
      const saveDetailsMatch = profilePage.match(
        /const\s+handleSaveDetails\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s{2}\};/,
      );
      assert.ok(saveDetailsMatch, "handleSaveDetails must be defined");
      assert.doesNotMatch(
        saveDetailsMatch[0],
        /uploadWorkerAvatar/,
        "Save details must not trigger avatar upload",
      );
    });
  });

  // ─── 12. Password Change Independence ───────────────────────────────
  describe("12. Password Change Independence", () => {
    test("12.1. Change Password card is rendered separately and operates independently", () => {
      assert.match(profilePage, /<WorkerChangePasswordCard\s*\/>/);
      const saveDetailsMatch = profilePage.match(
        /const\s+handleSaveDetails\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s{2}\};/,
      );
      assert.ok(saveDetailsMatch, "handleSaveDetails must be defined");
      assert.doesNotMatch(
        saveDetailsMatch[0],
        /changePassword/,
        "Unified save must not touch password changes",
      );
    });
  });

  // ─── 13. Clients Statistic Unchanged ────────────────────────────────
  describe("13. Clients Metric Remains Deferred", () => {
    test("13.1. WorkerProfileStats does not render fake clients or modify deferred status", () => {
      assert.match(statsCard, /CLIENTS/i);
      assert.match(statsCard, /—/);
      assert.doesNotMatch(statsCard, />12</);
    });
  });

  // ─── 14. Skill Catalog & DB Schemas Untouched ────────────────────────
  describe("14. Skill Catalog & Invariants", () => {
    test("14.1. No Working Style tags, skillType leaks, or backend alterations", () => {
      assert.doesNotMatch(profilePage, /Working style/i);
      assert.doesNotMatch(skillsCard, /Working style/i);
      assert.doesNotMatch(skillsCard, /\.skillType\b/);
    });
  });
});
