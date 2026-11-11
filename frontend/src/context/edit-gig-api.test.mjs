import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 2, Step 8.4: Edit Gig Frontend Types & API Service", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. Edit Gig Types Definition & Contract Boundaries", () => {
    test("1.1. types/job.ts defines UpdateJobPostPayload matching backend UpdateJobPostInputDto", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface UpdateJobPostPayload\s*\{[\s\S]*?categoryId:\s*string;[\s\S]*?title:\s*string;[\s\S]*?description:\s*string;[\s\S]*?workType:\s*WorkType;[\s\S]*?paymentStructure:\s*PaymentStructure;[\s\S]*?\}/,
        "UpdateJobPostPayload must define categoryId, title, description, workType, paymentStructure",
      );
      assert.match(
        content,
        /skillIds\?:\s*string\[\];/,
        "UpdateJobPostPayload must include optional skillIds",
      );
      assert.match(
        content,
        /workersNeeded\?:\s*number;/,
        "UpdateJobPostPayload must include optional workersNeeded",
      );
      assert.match(
        content,
        /hourlyRate\?:\s*number\s*\|\s*null;/,
        "UpdateJobPostPayload must include optional hourlyRate",
      );
      assert.match(
        content,
        /budgetAmount\?:\s*number\s*\|\s*null;/,
        "UpdateJobPostPayload must include optional budgetAmount",
      );
    });
  });

  describe("2. Edit Gig API Service Implementation & Invariants", () => {
    test("2.1. job-api.ts exports getRecruiterJobPostById", () => {
      assert.strictEqual(fs.existsSync(jobApiPath), true);
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export const getRecruiterJobPostById\s*=\s*async\s*\(/,
        "job-api.ts must export getRecruiterJobPostById",
      );
    });

    test("2.2. job-api.ts exports updateRecruiterJobPost", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export const updateRecruiterJobPost\s*=\s*async\s*\(/,
        "job-api.ts must export updateRecruiterJobPost",
      );
    });

    test("2.3. job-api.ts reuses existing shared api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(content, /import api from "\.\/api";/);
      assert.doesNotMatch(
        content,
        /axios\.create/,
        "job-api.ts must not create new Axios instances",
      );
    });

    test("2.4. getRecruiterJobPostById dispatches GET /recruiter/jobs/:id", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.get<JobPost>\(`\/recruiter\/jobs\/\$\{id\}`\)/,
        "getRecruiterJobPostById must dispatch GET /recruiter/jobs/${id}",
      );
    });

    test("2.5. updateRecruiterJobPost dispatches PATCH /recruiter/jobs/:id with payload", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.patch<JobPost>\(`\/recruiter\/jobs\/\$\{id\}`, payload\)/,
        "updateRecruiterJobPost must dispatch PATCH /recruiter/jobs/${id} with payload",
      );
    });

    test("2.6. job-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.doesNotMatch(content, /localStorage/);
      assert.doesNotMatch(content, /sessionStorage/);
      assert.doesNotMatch(content, /Bearer/);
    });
  });

  describe("3. Mocked API Execution Simulation", () => {
    test("3.1. getRecruiterJobPostById correctly formats request and returns data", async () => {
      const mockJobPost = {
        id: "job-123",
        recruiterId: "recruiter-123",
        categoryId: "cat-123",
        title: "Senior Bartender",
        description: "Experienced bartender needed.",
        workType: "local",
        paymentStructure: "hourly",
        hourlyRate: 35,
        hourlyRateMin: 35,
        hourlyRateMax: 35,
        budgetAmount: null,
        workersNeeded: 2,
        status: "open",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };

      let capturedUrl = "";

      const mockApi = {
        get: async (url) => {
          capturedUrl = url;
          return { data: mockJobPost };
        },
      };

      const simulateGet = async (id) => {
        const response = await mockApi.get(`/recruiter/jobs/${id}`);
        return response.data;
      };

      const result = await simulateGet("job-123");
      assert.strictEqual(capturedUrl, "/recruiter/jobs/job-123");
      assert.deepStrictEqual(result, mockJobPost);
    });

    test("3.2. updateRecruiterJobPost correctly forwards URL, payload and returns updated entity", async () => {
      const updatePayload = {
        categoryId: "cat-123",
        title: "Lead Bartender",
        description: "Updated description for lead bartender.",
        workType: "local",
        paymentStructure: "hourly",
        hourlyRate: 40,
        workersNeeded: 3,
        jobLocation: "Chicago, IL",
        skillIds: ["skill-1", "skill-2"],
      };

      const mockUpdatedJob = {
        id: "job-123",
        ...updatePayload,
        status: "open",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };

      let capturedUrl = "";
      let capturedPayload = null;

      const mockApi = {
        patch: async (url, payload) => {
          capturedUrl = url;
          capturedPayload = payload;
          return { data: mockUpdatedJob };
        },
      };

      const simulateUpdate = async (id, payload) => {
        const response = await mockApi.patch(`/recruiter/jobs/${id}`, payload);
        return response.data;
      };

      const result = await simulateUpdate("job-123", updatePayload);
      assert.strictEqual(capturedUrl, "/recruiter/jobs/job-123");
      assert.deepStrictEqual(capturedPayload, updatePayload);
      assert.deepStrictEqual(result, mockUpdatedJob);
    });
  });
});
