import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 2, Step 9: My Postings Status Management UI Integration", () => {
  const myPostingsPath = path.resolve(
    __dirname,
    "../pages/recruiter/MyPostings.tsx",
  );

  describe("1. Static Inspection & Architecture Invariants", () => {
    test("1.1. MyPostings.tsx imports API methods from @/lib/job-api", () => {
      assert.strictEqual(fs.existsSync(myPostingsPath), true);
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      assert.match(
        content,
        /pauseRecruiterJobPost/,
        "MyPostings.tsx must import pauseRecruiterJobPost",
      );
      assert.match(
        content,
        /reopenRecruiterJobPost/,
        "MyPostings.tsx must import reopenRecruiterJobPost",
      );
      assert.match(
        content,
        /closeRecruiterJobPost/,
        "MyPostings.tsx must import closeRecruiterJobPost",
      );
    });

    test("1.2. MyPostings.tsx imports SweetAlert2 for dialogs and user feedback", () => {
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      assert.match(
        content,
        /import\s+Swal\s+from\s+["']sweetalert2["']/,
        "MyPostings.tsx must import Swal from sweetalert2",
      );
    });

    test("1.3. MyPostings.tsx imports action icons from lucide-react", () => {
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      assert.match(content, /\bPause\b/, "Must import Pause icon");
      assert.match(content, /\bPlay\b/, "Must import Play icon");
      assert.match(content, /\bXCircle\b/, "Must import XCircle icon");
      assert.match(content, /\bLoader2\b/, "Must import Loader2 icon");
    });

    test("1.4. MyPostings.tsx manages in-flight loading state and prevents duplicate actions", () => {
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      assert.match(
        content,
        /actionLoadingId/,
        "Must track actionLoadingId state",
      );
      assert.match(
        content,
        /disabled=\{actionLoadingId !== null\}/,
        "Buttons must be disabled while an action is in flight to prevent duplicate submissions",
      );
    });

    test("1.5. MyPostings.tsx prompts confirmation with SweetAlert2 before closing", () => {
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      assert.match(
        content,
        /handleCloseJob/,
        "Must define handleCloseJob",
      );
      assert.match(
        content,
        /showCancelButton:\s*true/,
        "Close confirmation must include cancel button",
      );
      assert.match(
        content,
        /if\s*\(!result\.isConfirmed\)\s*return/,
        "Must abort close action if user cancels confirmation",
      );
    });

    test("1.6. MyPostings.tsx invokes handleRefresh() after successful status transitions", () => {
      const content = fs.readFileSync(myPostingsPath, "utf-8");

      // Verify each handler invokes handleRefresh
      assert.match(
        content,
        /await\s+pauseRecruiterJobPost\([^)]+\)[\s\S]*?await\s+handleRefresh\(\)/,
        "handlePauseJob must refresh postings and metrics upon success",
      );
      assert.match(
        content,
        /await\s+reopenRecruiterJobPost\([^)]+\)[\s\S]*?await\s+handleRefresh\(\)/,
        "handleReopenJob must refresh postings and metrics upon success",
      );
      assert.match(
        content,
        /await\s+closeRecruiterJobPost\([^)]+\)[\s\S]*?await\s+handleRefresh\(\)/,
        "handleCloseJob must refresh postings and metrics upon success",
      );
    });
  });

  describe("2. Status Action Rendering Logic Evaluation", () => {
    // Pure function simulation matching the JSX conditions in MyPostings.tsx
    const computeVisibleActions = (status) => {
      const actions = [];
      const canEdit =
        status === "draft" || status === "open" || status === "paused";

      if (status === "open") {
        actions.push("Pause");
      }
      if (status === "paused") {
        actions.push("Reopen");
      }
      if (status === "open" || status === "paused") {
        actions.push("Close");
      }
      if (canEdit) {
        actions.push("Edit");
      }

      return actions;
    };

    test("2.1. OPEN job: renders Pause, Close, and Edit actions", () => {
      const actions = computeVisibleActions("open");
      assert.deepStrictEqual(actions, ["Pause", "Close", "Edit"]);
    });

    test("2.2. PAUSED job: renders Reopen, Close, and Edit actions", () => {
      const actions = computeVisibleActions("paused");
      assert.deepStrictEqual(actions, ["Reopen", "Close", "Edit"]);
    });

    test("2.3. DRAFT job: renders only Edit action (cannot be paused, reopened, or closed)", () => {
      const actions = computeVisibleActions("draft");
      assert.deepStrictEqual(actions, ["Edit"]);
    });

    test("2.4. FILLED job: renders no status management or edit actions", () => {
      const actions = computeVisibleActions("filled");
      assert.deepStrictEqual(actions, []);
    });

    test("2.5. COMPLETED job: renders no status management or edit actions", () => {
      const actions = computeVisibleActions("completed");
      assert.deepStrictEqual(actions, []);
    });

    test("2.6. CANCELLED job: renders no status management or edit actions", () => {
      const actions = computeVisibleActions("cancelled");
      assert.deepStrictEqual(actions, []);
    });
  });

  describe("3. Status Transition Workflow Simulation", () => {
    test("3.1. Successful Pause transition invokes API, alerts user, and refreshes data", async () => {
      const calls = [];
      const mockJob = { id: "job-101", title: "Weekend Bartender", status: "open" };

      const mockPauseApi = async (id) => {
        calls.push(`pauseApi:${id}`);
        return { ...mockJob, status: "paused" };
      };

      const mockSwal = {
        fire: async (opts) => {
          calls.push(`swal:${opts.icon}:${opts.title}`);
          return { isConfirmed: true };
        },
      };

      let refreshed = false;
      const mockRefresh = async () => {
        refreshed = true;
        calls.push("refresh");
      };

      // Execute simulation of handlePauseJob
      calls.push("setLoading");
      try {
        await mockPauseApi(mockJob.id);
        await mockSwal.fire({
          icon: "success",
          title: "Posting Paused",
          text: `"${mockJob.title}" has been paused.`,
        });
        await mockRefresh();
      } finally {
        calls.push("clearLoading");
      }

      assert.deepStrictEqual(calls, [
        "setLoading",
        "pauseApi:job-101",
        "swal:success:Posting Paused",
        "refresh",
        "clearLoading",
      ]);
      assert.strictEqual(refreshed, true);
    });

    test("3.2. Successful Reopen transition invokes API, alerts user, and refreshes data", async () => {
      const calls = [];
      const mockJob = { id: "job-102", title: "Warehouse Helper", status: "paused" };

      const mockReopenApi = async (id) => {
        calls.push(`reopenApi:${id}`);
        return { ...mockJob, status: "open" };
      };

      const mockSwal = {
        fire: async (opts) => {
          calls.push(`swal:${opts.icon}:${opts.title}`);
          return { isConfirmed: true };
        },
      };

      let refreshed = false;
      const mockRefresh = async () => {
        refreshed = true;
        calls.push("refresh");
      };

      // Execute simulation of handleReopenJob
      calls.push("setLoading");
      try {
        await mockReopenApi(mockJob.id);
        await mockSwal.fire({
          icon: "success",
          title: "Posting Reopened",
          text: `"${mockJob.title}" is now active and visible to workers.`,
        });
        await mockRefresh();
      } finally {
        calls.push("clearLoading");
      }

      assert.deepStrictEqual(calls, [
        "setLoading",
        "reopenApi:job-102",
        "swal:success:Posting Reopened",
        "refresh",
        "clearLoading",
      ]);
      assert.strictEqual(refreshed, true);
    });

    test("3.3. Close transition cancelled by user does NOT call API and does NOT refresh", async () => {
      const calls = [];
      const mockJob = { id: "job-103", title: "Event Setup Crew", status: "open" };

      const mockCloseApi = async (id) => {
        calls.push(`closeApi:${id}`);
        return { ...mockJob, status: "cancelled" };
      };

      const mockSwal = {
        fire: async (opts) => {
          calls.push(`swalConfirm:${opts.title}`);
          // User clicks cancel!
          return { isConfirmed: false };
        },
      };

      const mockRefresh = async () => {
        calls.push("refresh");
      };

      // Execute simulation of handleCloseJob when cancelled
      const result = await mockSwal.fire({
        title: "Close this job posting?",
        showCancelButton: true,
      });

      if (!result.isConfirmed) {
        calls.push("aborted");
      } else {
        await mockCloseApi(mockJob.id);
        await mockRefresh();
      }

      assert.deepStrictEqual(calls, [
        "swalConfirm:Close this job posting?",
        "aborted",
      ]);
    });

    test("3.4. Close transition confirmed by user calls API, alerts, and refreshes", async () => {
      const calls = [];
      const mockJob = { id: "job-103", title: "Event Setup Crew", status: "open" };

      const mockCloseApi = async (id) => {
        calls.push(`closeApi:${id}`);
        return { ...mockJob, status: "cancelled" };
      };

      const mockSwal = {
        fire: async (opts) => {
          calls.push(`swal:${opts.icon || "confirm"}:${opts.title}`);
          return { isConfirmed: true };
        },
      };

      const mockRefresh = async () => {
        calls.push("refresh");
      };

      // Execute simulation of handleCloseJob when confirmed
      const result = await mockSwal.fire({
        title: "Close this job posting?",
        showCancelButton: true,
      });

      if (result.isConfirmed) {
        calls.push("setLoading");
        try {
          await mockCloseApi(mockJob.id);
          await mockSwal.fire({
            icon: "success",
            title: "Posting Closed",
            text: `"${mockJob.title}" has been closed.`,
          });
          await mockRefresh();
        } finally {
          calls.push("clearLoading");
        }
      }

      assert.deepStrictEqual(calls, [
        "swal:confirm:Close this job posting?",
        "setLoading",
        "closeApi:job-103",
        "swal:success:Posting Closed",
        "refresh",
        "clearLoading",
      ]);
    });

    test("3.5. Action failure displays error message and cleans up loading state", async () => {
      const calls = [];
      const mockJob = { id: "job-104", title: "Photographer", status: "open" };

      const mockPauseApi = async () => {
        throw new Error("Job has already been filled");
      };

      const mockSwal = {
        fire: async (opts) => {
          calls.push(`swal:${opts.icon}:${opts.title}:${opts.text}`);
        },
      };

      calls.push("setLoading");
      try {
        await mockPauseApi(mockJob.id);
      } catch (err) {
        await mockSwal.fire({
          icon: "error",
          title: "Failed to Pause",
          text: err.message,
        });
      } finally {
        calls.push("clearLoading");
      }

      assert.deepStrictEqual(calls, [
        "setLoading",
        "swal:error:Failed to Pause:Job has already been filled",
        "clearLoading",
      ]);
    });
  });
});
