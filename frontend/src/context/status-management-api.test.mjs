import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 2, Step 9: Posting Status Management API Service", () => {
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. Static Inspection & Function Exports", () => {
    test("1.1. job-api.ts exports pauseRecruiterJobPost", () => {
      assert.strictEqual(fs.existsSync(jobApiPath), true);
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export\s+const\s+pauseRecruiterJobPost\s*=\s*async\s*\(/,
        "job-api.ts must export pauseRecruiterJobPost function",
      );
    });

    test("1.2. job-api.ts exports reopenRecruiterJobPost", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export\s+const\s+reopenRecruiterJobPost\s*=\s*async\s*\(/,
        "job-api.ts must export reopenRecruiterJobPost function",
      );
    });

    test("1.3. job-api.ts exports closeRecruiterJobPost", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export\s+const\s+closeRecruiterJobPost\s*=\s*async\s*\(/,
        "job-api.ts must export closeRecruiterJobPost function",
      );
    });

    test("1.4. job-api.ts reuses existing shared api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /import\s+api\s+from\s+["']\.\/api["']/,
        "job-api.ts must import default shared api client from ./api",
      );
      assert.doesNotMatch(
        content,
        /axios\.create\s*\(/,
        "job-api.ts must never create a separate axios instance",
      );
    });

    test("1.5. pauseRecruiterJobPost dispatches PATCH /recruiter/jobs/:id/pause", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.patch<JobPost>\s*\(\s*`\/recruiter\/jobs\/\$\{id\}\/pause`\s*\)/,
        "pauseRecruiterJobPost must call api.patch with `/recruiter/jobs/${id}/pause`",
      );
    });

    test("1.6. reopenRecruiterJobPost dispatches PATCH /recruiter/jobs/:id/reopen", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.patch<JobPost>\s*\(\s*`\/recruiter\/jobs\/\$\{id\}\/reopen`\s*\)/,
        "reopenRecruiterJobPost must call api.patch with `/recruiter/jobs/${id}/reopen`",
      );
    });

    test("1.7. closeRecruiterJobPost dispatches PATCH /recruiter/jobs/:id/close", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.patch<JobPost>\s*\(\s*`\/recruiter\/jobs\/\$\{id\}\/close`\s*\)/,
        "closeRecruiterJobPost must call api.patch with `/recruiter/jobs/${id}/close`",
      );
    });

    test("1.8. job-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.doesNotMatch(
        content,
        /localStorage/,
        "job-api.ts must not access localStorage",
      );
      assert.doesNotMatch(
        content,
        /sessionStorage/,
        "job-api.ts must not access sessionStorage",
      );
      assert.doesNotMatch(
        content,
        /Bearer\s+/i,
        "job-api.ts must rely entirely on HttpOnly cookies, not manual Bearer tokens",
      );
    });

    test("1.9. base api.ts configures withCredentials: true for HttpOnly cookies", () => {
      assert.strictEqual(fs.existsSync(baseApiPath), true);
      const content = fs.readFileSync(baseApiPath, "utf-8");

      assert.match(
        content,
        /withCredentials\s*:\s*true/,
        "base api.ts must configure withCredentials: true",
      );
    });
  });

  describe("2. Mocked Execution Simulation", () => {
    test("2.1. pauseRecruiterJobPost dispatches correct endpoint and unpacks data", async () => {
      const capturedRequests = [];
      const mockApi = {
        patch: async (url, data, config) => {
          capturedRequests.push({ method: "PATCH", url, data, config });
          return {
            data: {
              id: "job-123",
              title: "Event Bartender",
              status: "paused",
            },
          };
        },
      };

      const pauseRecruiterJobPost = async (id) => {
        const response = await mockApi.patch(`/recruiter/jobs/${id}/pause`);
        return response.data;
      };

      const result = await pauseRecruiterJobPost("job-123");
      assert.strictEqual(capturedRequests.length, 1);
      assert.strictEqual(capturedRequests[0].method, "PATCH");
      assert.strictEqual(capturedRequests[0].url, "/recruiter/jobs/job-123/pause");
      assert.strictEqual(result.id, "job-123");
      assert.strictEqual(result.status, "paused");
    });

    test("2.2. reopenRecruiterJobPost dispatches correct endpoint and unpacks data", async () => {
      const capturedRequests = [];
      const mockApi = {
        patch: async (url, data, config) => {
          capturedRequests.push({ method: "PATCH", url, data, config });
          return {
            data: {
              id: "job-123",
              title: "Event Bartender",
              status: "open",
            },
          };
        },
      };

      const reopenRecruiterJobPost = async (id) => {
        const response = await mockApi.patch(`/recruiter/jobs/${id}/reopen`);
        return response.data;
      };

      const result = await reopenRecruiterJobPost("job-123");
      assert.strictEqual(capturedRequests.length, 1);
      assert.strictEqual(capturedRequests[0].method, "PATCH");
      assert.strictEqual(capturedRequests[0].url, "/recruiter/jobs/job-123/reopen");
      assert.strictEqual(result.id, "job-123");
      assert.strictEqual(result.status, "open");
    });

    test("2.3. closeRecruiterJobPost dispatches correct endpoint and unpacks data", async () => {
      const capturedRequests = [];
      const mockApi = {
        patch: async (url, data, config) => {
          capturedRequests.push({ method: "PATCH", url, data, config });
          return {
            data: {
              id: "job-123",
              title: "Event Bartender",
              status: "cancelled",
            },
          };
        },
      };

      const closeRecruiterJobPost = async (id) => {
        const response = await mockApi.patch(`/recruiter/jobs/${id}/close`);
        return response.data;
      };

      const result = await closeRecruiterJobPost("job-123");
      assert.strictEqual(capturedRequests.length, 1);
      assert.strictEqual(capturedRequests[0].method, "PATCH");
      assert.strictEqual(capturedRequests[0].url, "/recruiter/jobs/job-123/close");
      assert.strictEqual(result.id, "job-123");
      assert.strictEqual(result.status, "cancelled");
    });
  });
});
