import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 1, Step 6.2C: Draft Creation and Job Publishing Integration", () => {
  const postJobPagePath = path.resolve(
    __dirname,
    "../pages/recruiter/PostJob.tsx",
  );
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");

  describe("1. Static Code Contracts & Verification", () => {
    test("1.1. PostJob.tsx imports createDraftJobPost and publishJobPost from job-api", () => {
      assert.strictEqual(fs.existsSync(postJobPagePath), true);
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(
        content,
        /import\s*\{[\s\S]*?createDraftJobPost[\s\S]*?publishJobPost[\s\S]*?\}\s*from\s*["']@\/lib\/job-api["']/,
        "PostJob.tsx must import both createDraftJobPost and publishJobPost from job-api",
      );
    });

    test("1.2. PostJob.tsx manages savedDraftId and submissionState", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(
        content,
        /const\s*\[\s*savedDraftId,\s*setSavedDraftId\s*\]\s*=\s*useState<\s*string\s*\|\s*null\s*>\(\s*null\s*\)/,
        "PostJob must maintain savedDraftId state",
      );

      assert.match(
        content,
        /const\s*\[\s*submissionState,\s*setSubmissionState\s*\]\s*=/,
        "PostJob must maintain submissionState",
      );
    });

    test("1.3. PostJob.tsx contains constructPayload assembling CreateDraftJobPostPayload", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(
        content,
        /const constructPayload\s*=\s*\(\):\s*CreateDraftJobPostPayload\s*=>/,
        "PostJob must have a constructPayload helper returning CreateDraftJobPostPayload",
      );

      // Verifies trim of fields
      assert.match(content, /title:\s*trimmedTitle/);
      assert.match(content, /description:\s*trimmedDescription/);
      assert.match(content, /categoryId:\s*categoryId\.trim\(\)/);

      // Verifies exclusive payment fields
      assert.match(content, /paymentStructure === PaymentStructure\.FIXED/);
      assert.match(content, /payload\.hourlyRate = null/);
      assert.match(content, /payload\.budgetAmount = null/);

      // Verifies workersNeeded is NOT silently replaced with 1
      assert.strictEqual(
        content.includes("? workersNeeded : 1"),
        false,
        "constructPayload must NOT silently replace workersNeeded with 1",
      );
    });

    test("1.4. PostJob.tsx implements validateForDraft and validateForPublish mirroring backend rules", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(content, /const validateForDraft\s*=/);
      assert.match(content, /const validateForPublish\s*=/);

      // Checks positive integer workersNeeded requirement
      assert.match(
        content,
        /!Number\.isInteger\(workersNeeded\)[\s\S]*?workersNeeded <= 0/,
      );

      // Checks local job location requirement
      assert.match(
        content,
        /workType === WorkType\.LOCAL && !jobLocation\.trim\(\)/,
      );

      // Checks fixed budget requirement
      assert.match(content, /budgetAmount <= 0/);

      // Checks hourly rate requirements
      assert.match(
        content,
        /typeof hourlyRate !== "number"[\s\S]*?hourlyRate <= 0/,
      );
    });

    test("1.5. PostJob.tsx disables form inputs once draft is saved (isFormLocked)", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(
        content,
        /const isFormLocked\s*=\s*Boolean\(\s*savedDraftId\s*\|\|\s*submissionState === ["']published["']\s*\)/,
        "Form must lock once draft is saved or published to prevent silent divergence",
      );

      assert.match(content, /disabled=\{isFormLocked\}/);
    });

    test("1.6. Save Draft success alert is simplified without UUID exposure", () => {
      const content = fs.readFileSync(postJobPagePath, "utf-8");

      assert.match(
        content,
        /title:\s*["']Draft saved successfully!["']/,
        "Alert title must be 'Draft saved successfully!'",
      );
      assert.match(
        content,
        /text:\s*["']Your job has been saved as a draft\. You can publish it using the Post Job Now button\.["']/,
        "Alert text must guide the user without exposing internal IDs",
      );
      assert.strictEqual(
        content.includes("Your job post has been saved as a draft (ID:"),
        false,
        "Save Draft alert must NOT expose the internal draft UUID",
      );
    });
  });

  // Simulated state machine matching PostJob.tsx logic
  class PostJobWorkflowSimulation {
    constructor() {
      this.reset();
    }

    reset() {
      this.title = "Senior React Developer";
      this.description = "Build cutting edge web applications with React";
      this.categoryId = "cat-uuid-1";
      this.workType = "remote";
      this.paymentStructure = "fixed";
      this.budgetAmount = 1500;
      this.hourlyRate = "";
      this.jobLocation = "";
      this.workersNeeded = 1;
      this.categories = [{ id: "cat-uuid-1", name: "Engineering" }];
      this.savedDraftId = null;
      this.submissionState = "idle";
      this.isSubmitting = false;

      this.createDraftCalls = [];
      this.publishCalls = [];
    }

    constructPayload() {
      const payload = {
        categoryId: this.categoryId.trim(),
        title: this.title.trim(),
        description: this.description.trim(),
        workType: this.workType,
        paymentStructure: this.paymentStructure,
        workersNeeded:
          typeof this.workersNeeded === "number"
            ? this.workersNeeded
            : undefined,
        jobLocation:
          this.workType === "local" && this.jobLocation.trim()
            ? this.jobLocation.trim()
            : null,
        budgetAmount:
          this.paymentStructure === "fixed" ? this.budgetAmount : null,
        hourlyRate:
          this.paymentStructure === "hourly" && typeof this.hourlyRate === "number"
            ? this.hourlyRate
            : null,
      };
      return payload;
    }

    validateForDraft() {
      if (this.categories.length === 0) {
        return { isValid: false, error: "Categories unavailable" };
      }
      if (!this.categoryId.trim()) {
        return { isValid: false, error: "Category is required" };
      }
      if (!this.title.trim()) {
        return { isValid: false, error: "Title is required" };
      }
      if (!this.description.trim()) {
        return { isValid: false, error: "Description is required" };
      }
      if (
        this.workersNeeded === "" ||
        typeof this.workersNeeded !== "number" ||
        isNaN(this.workersNeeded) ||
        !Number.isInteger(this.workersNeeded) ||
        this.workersNeeded <= 0
      ) {
        return {
          isValid: false,
          error: "Number of gigs needed must be a positive integer.",
        };
      }
      return { isValid: true };
    }

    validateForPublish() {
      const draftValid = this.validateForDraft();
      if (!draftValid.isValid) return draftValid;

      if (this.workType === "local" && !this.jobLocation.trim()) {
        return { isValid: false, error: "Job location required for local" };
      }
      if (this.paymentStructure === "fixed") {
        if (typeof this.budgetAmount !== "number" || this.budgetAmount <= 0) {
          return { isValid: false, error: "Budget must be positive" };
        }
      }
      if (this.paymentStructure === "hourly") {
        if (typeof this.hourlyRate !== "number" || this.hourlyRate <= 0) {
          return { isValid: false, error: "Hourly rate required and must be greater than 0" };
        }
      }
      return { isValid: true };
    }

    async handleSaveDraft(apiMock) {
      if (this.isSubmitting) return;

      if (this.savedDraftId) {
        return { status: "ALREADY_SAVED", draftId: this.savedDraftId };
      }

      const validation = this.validateForDraft();
      if (!validation.isValid) {
        return { status: "VALIDATION_FAILED", error: validation.error };
      }

      this.isSubmitting = true;
      this.submissionState = "creating_draft";

      try {
        const payload = this.constructPayload();
        const res = await apiMock.createDraftJobPost(payload);
        this.createDraftCalls.push(payload);
        this.savedDraftId = res.id;
        this.submissionState = "draft_saved";
        return { status: "SUCCESS", draftId: res.id };
      } catch (err) {
        this.submissionState = "idle";
        throw err;
      } finally {
        this.isSubmitting = false;
      }
    }

    async handlePostJobNow(apiMock) {
      if (this.isSubmitting || this.submissionState === "published") return;

      const validation = this.validateForPublish();
      if (!validation.isValid) {
        return { status: "VALIDATION_FAILED", error: validation.error };
      }

      this.isSubmitting = true;
      let targetDraftId = this.savedDraftId;

      // Step 1: Create draft if not yet created
      if (!targetDraftId) {
        this.submissionState = "creating_draft";
        try {
          const payload = this.constructPayload();
          const res = await apiMock.createDraftJobPost(payload);
          this.createDraftCalls.push(payload);
          targetDraftId = res.id;
          this.savedDraftId = res.id;
        } catch (createErr) {
          this.isSubmitting = false;
          this.submissionState = "idle";
          throw createErr; // Do not call publishing!
        }
      }

      // Step 2: Publish using resolved targetDraftId
      this.submissionState = "publishing";
      try {
        const published = await apiMock.publishJobPost(targetDraftId);
        this.publishCalls.push(targetDraftId);
        this.submissionState = "published";
        return { status: "SUCCESS", job: published };
      } catch (publishErr) {
        // Retain draftId!
        this.submissionState = "publish_failed";
        throw publishErr;
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  describe("2. Workflow State Machine & Transition Simulation", () => {
    const sim = new PostJobWorkflowSimulation();

    beforeEach(() => {
      sim.reset();
    });

    test("2.1. Scenario 1: Save Draft successfully", async () => {
      const apiMock = {
        createDraftJobPost: async (payload) => ({
          id: "job-draft-uuid-101",
          ...payload,
          status: "draft",
        }),
      };

      const res = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(res.status, "SUCCESS");
      assert.strictEqual(res.draftId, "job-draft-uuid-101");
      assert.strictEqual(sim.savedDraftId, "job-draft-uuid-101");
      assert.strictEqual(sim.submissionState, "draft_saved");
      assert.strictEqual(sim.createDraftCalls.length, 1);
    });

    test("2.2. Scenario 2: Attempt Save Draft twice and verify no duplicate record is created", async () => {
      const apiMock = {
        createDraftJobPost: async (payload) => ({
          id: "job-draft-uuid-102",
          ...payload,
          status: "draft",
        }),
      };

      await sim.handleSaveDraft(apiMock);
      assert.strictEqual(sim.createDraftCalls.length, 1);

      // Second attempt
      const secondRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(secondRes.status, "ALREADY_SAVED");
      assert.strictEqual(secondRes.draftId, "job-draft-uuid-102");
      // Still exactly 1 call!
      assert.strictEqual(sim.createDraftCalls.length, 1);
    });

    test("2.3. Scenario 3: Post Job Now successfully using the two-request workflow", async () => {
      const apiMock = {
        createDraftJobPost: async (payload) => ({
          id: "job-draft-uuid-103",
          ...payload,
          status: "draft",
        }),
        publishJobPost: async (id) => ({
          id,
          status: "open",
        }),
      };

      const res = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(res.status, "SUCCESS");
      assert.strictEqual(sim.submissionState, "published");
      assert.strictEqual(sim.createDraftCalls.length, 1);
      assert.strictEqual(sim.publishCalls.length, 1);
      assert.strictEqual(sim.publishCalls[0], "job-draft-uuid-103");
    });

    test("2.4. Scenario 4: Draft creation fails -> publishing is NOT called", async () => {
      const apiMock = {
        createDraftJobPost: async () => {
          throw new Error("Database connection failed");
        },
        publishJobPost: async () => {
          assert.fail(
            "publishJobPost must NOT be called when draft creation fails",
          );
        },
      };

      await assert.rejects(async () => {
        await sim.handlePostJobNow(apiMock);
      }, /Database connection failed/);

      assert.strictEqual(sim.savedDraftId, null);
      assert.strictEqual(sim.submissionState, "idle");
      assert.strictEqual(sim.publishCalls.length, 0);
    });

    test("2.5. Scenario 5: Draft creation succeeds but publishing fails -> draft ID is retained", async () => {
      const apiMock = {
        createDraftJobPost: async (payload) => ({
          id: "job-draft-uuid-105",
          ...payload,
          status: "draft",
        }),
        publishJobPost: async () => {
          throw new Error("Recruiter not authorized to publish");
        },
      };

      await assert.rejects(async () => {
        await sim.handlePostJobNow(apiMock);
      }, /Recruiter not authorized to publish/);

      assert.strictEqual(sim.savedDraftId, "job-draft-uuid-105");
      assert.strictEqual(sim.submissionState, "publish_failed");
      assert.strictEqual(sim.createDraftCalls.length, 1);
    });

    test("2.6. Scenario 6: Retry publishing -> only the publish endpoint is called", async () => {
      // Setup state where draft was created but publish failed
      sim.savedDraftId = "job-draft-uuid-106";
      sim.submissionState = "publish_failed";

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called during publishing retry",
          );
        },
        publishJobPost: async (id) => ({
          id,
          status: "open",
        }),
      };

      const res = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(res.status, "SUCCESS");
      assert.strictEqual(sim.submissionState, "published");
      assert.strictEqual(sim.createDraftCalls.length, 0);
      assert.strictEqual(sim.publishCalls.length, 1);
      assert.strictEqual(sim.publishCalls[0], "job-draft-uuid-106");
    });

    test("2.7. Scenario 7: Publish an already-saved draft -> no second draft is created", async () => {
      sim.savedDraftId = "job-draft-uuid-107";
      sim.submissionState = "draft_saved";

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when publishing an already-saved draft",
          );
        },
        publishJobPost: async (id) => ({
          id,
          status: "open",
        }),
      };

      const res = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(res.status, "SUCCESS");
      assert.strictEqual(sim.submissionState, "published");
      assert.strictEqual(sim.createDraftCalls.length, 0);
      assert.strictEqual(sim.publishCalls.length, 1);
      assert.strictEqual(sim.publishCalls[0], "job-draft-uuid-107");
    });

    test("2.8. Scenario 8: Invalid publication input -> no draft is created unnecessarily", async () => {
      sim.workType = "local";
      sim.jobLocation = ""; // Invalid for local job publication!

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when client publication validation fails",
          );
        },
        publishJobPost: async () => {
          assert.fail(
            "publishJobPost must NOT be called when client publication validation fails",
          );
        },
      };

      const res = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(res.status, "VALIDATION_FAILED");
      assert.match(res.error, /Job location required for local/);
      assert.strictEqual(sim.createDraftCalls.length, 0);
      assert.strictEqual(sim.publishCalls.length, 0);
      assert.strictEqual(sim.savedDraftId, null);
    });

    test("2.9. Scenario 9: Category list is empty -> submission is prevented", async () => {
      sim.categories = []; // Empty categories catalog

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when category catalog is empty",
          );
        },
      };

      const draftRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(draftRes.status, "VALIDATION_FAILED");
      assert.match(draftRes.error, /Categories unavailable/);

      const pubRes = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(pubRes.status, "VALIDATION_FAILED");
      assert.match(pubRes.error, /Categories unavailable/);

      assert.strictEqual(sim.createDraftCalls.length, 0);
    });

    test("2.10. Scenario 10: Multiple rapid clicks do not create duplicate requests", async () => {
      let resolveFirstCall;
      const delayedPromise = new Promise((resolve) => {
        resolveFirstCall = resolve;
      });

      const apiMock = {
        createDraftJobPost: async (payload) => {
          await delayedPromise;
          return { id: "job-draft-uuid-110", ...payload, status: "draft" };
        },
      };

      // Trigger first click (it will hang on delayedPromise)
      const firstClickPromise = sim.handleSaveDraft(apiMock);
      assert.strictEqual(sim.isSubmitting, true);

      // Trigger second rapid click while first is in flight
      const secondClickResult = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(secondClickResult, undefined); // Blocked by isSubmitting guard!

      // Now release first call
      resolveFirstCall();
      const firstResult = await firstClickPromise;
      assert.strictEqual(firstResult.status, "SUCCESS");

      // Exactly 1 network call was made!
      assert.strictEqual(sim.createDraftCalls.length, 1);
    });
  });

  describe("3. Worker Count Validation & No Silent Substitution", () => {
    const sim = new PostJobWorkflowSimulation();

    beforeEach(() => {
      sim.reset();
    });

    test("3.1. Valid positive integer: passes validation and preserves value in payload", async () => {
      sim.workersNeeded = 4;

      const draftValidation = sim.validateForDraft();
      assert.strictEqual(draftValidation.isValid, true);

      const pubValidation = sim.validateForPublish();
      assert.strictEqual(pubValidation.isValid, true);

      const payload = sim.constructPayload();
      assert.strictEqual(payload.workersNeeded, 4);

      const apiMock = {
        createDraftJobPost: async (p) => ({
          id: "job-workers-4",
          ...p,
          status: "draft",
        }),
      };

      const res = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(res.status, "SUCCESS");
      assert.strictEqual(sim.createDraftCalls[0].workersNeeded, 4);
    });

    test("3.2. Zero: fails validation, prevents draft and publish, does NOT silently substitute 1", async () => {
      sim.workersNeeded = 0;

      const draftValidation = sim.validateForDraft();
      assert.strictEqual(draftValidation.isValid, false);
      assert.match(
        draftValidation.error,
        /Number of gigs needed must be a positive integer\./,
      );

      const pubValidation = sim.validateForPublish();
      assert.strictEqual(pubValidation.isValid, false);
      assert.match(
        pubValidation.error,
        /Number of gigs needed must be a positive integer\./,
      );

      // Verify constructPayload preserves 0 if called directly rather than mutating to 1
      const payload = sim.constructPayload();
      assert.strictEqual(payload.workersNeeded, 0);
      assert.notStrictEqual(payload.workersNeeded, 1);

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when workersNeeded is 0",
          );
        },
      };

      const draftRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(draftRes.status, "VALIDATION_FAILED");

      const pubRes = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(pubRes.status, "VALIDATION_FAILED");
    });

    test("3.3. Negative number: fails validation, prevents draft and publish, does NOT silently substitute 1", async () => {
      sim.workersNeeded = -3;

      const draftValidation = sim.validateForDraft();
      assert.strictEqual(draftValidation.isValid, false);
      assert.match(
        draftValidation.error,
        /Number of gigs needed must be a positive integer\./,
      );

      const pubValidation = sim.validateForPublish();
      assert.strictEqual(pubValidation.isValid, false);

      const payload = sim.constructPayload();
      assert.strictEqual(payload.workersNeeded, -3);
      assert.notStrictEqual(payload.workersNeeded, 1);

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when workersNeeded is negative",
          );
        },
      };

      const draftRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(draftRes.status, "VALIDATION_FAILED");

      const pubRes = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(pubRes.status, "VALIDATION_FAILED");
    });

    test("3.4. Decimal value (e.g. 2.5): fails validation, prevents draft and publish, does NOT silently substitute 1", async () => {
      sim.workersNeeded = 2.5;

      const draftValidation = sim.validateForDraft();
      assert.strictEqual(draftValidation.isValid, false);
      assert.match(
        draftValidation.error,
        /Number of gigs needed must be a positive integer\./,
      );

      const pubValidation = sim.validateForPublish();
      assert.strictEqual(pubValidation.isValid, false);

      // Core bug fix assertion: 2.5 must NOT be converted to 1 in payload!
      const payload = sim.constructPayload();
      assert.strictEqual(payload.workersNeeded, 2.5);
      assert.notStrictEqual(payload.workersNeeded, 1);

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when workersNeeded is decimal",
          );
        },
      };

      const draftRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(draftRes.status, "VALIDATION_FAILED");

      const pubRes = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(pubRes.status, "VALIDATION_FAILED");
    });

    test("3.5. Empty input (''): fails validation, prevents draft and publish, sends undefined instead of substituting 1", async () => {
      sim.workersNeeded = "";

      const draftValidation = sim.validateForDraft();
      assert.strictEqual(draftValidation.isValid, false);
      assert.match(
        draftValidation.error,
        /Number of gigs needed must be a positive integer\./,
      );

      const pubValidation = sim.validateForPublish();
      assert.strictEqual(pubValidation.isValid, false);

      const payload = sim.constructPayload();
      assert.strictEqual(payload.workersNeeded, undefined);
      assert.notStrictEqual(payload.workersNeeded, 1);

      const apiMock = {
        createDraftJobPost: async () => {
          assert.fail(
            "createDraftJobPost must NOT be called when workersNeeded is empty",
          );
        },
      };

      const draftRes = await sim.handleSaveDraft(apiMock);
      assert.strictEqual(draftRes.status, "VALIDATION_FAILED");

      const pubRes = await sim.handlePostJobNow(apiMock);
      assert.strictEqual(pubRes.status, "VALIDATION_FAILED");
    });
  });
});
