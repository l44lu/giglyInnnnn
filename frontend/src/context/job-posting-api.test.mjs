import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 1, Step 6.2A: Job Posting Types & API Integration", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");
  const workerApiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const workerTypesPath = path.resolve(__dirname, "../types/worker-profile.ts");

  describe("1. Job Posting Types Definition & Contract Boundaries", () => {
    test("1.1. types/job.ts exists and defines WorkType, PaymentStructure, and JobStatus enums/types", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export const WorkType\s*=\s*\{[\s\S]*?REMOTE:\s*["']remote["'][\s\S]*?LOCAL:\s*["']local["'][\s\S]*?\}\s*as const;/,
        "WorkType must define REMOTE: 'remote' and LOCAL: 'local'",
      );
      assert.match(
        content,
        /export type WorkType\s*=/,
        "WorkType type must be exported",
      );

      assert.match(
        content,
        /export const PaymentStructure\s*=\s*\{[\s\S]*?FIXED:\s*["']fixed["'][\s\S]*?HOURLY:\s*["']hourly["'][\s\S]*?\}\s*as const;/,
        "PaymentStructure must define FIXED: 'fixed' and HOURLY: 'hourly'",
      );
      assert.match(
        content,
        /export type PaymentStructure\s*=/,
        "PaymentStructure type must be exported",
      );

      assert.match(
        content,
        /export const JobStatus\s*=\s*\{[\s\S]*?DRAFT:\s*["']draft["'][\s\S]*?OPEN:\s*["']open["'][\s\S]*?\}\s*as const;/,
        "JobStatus must define DRAFT: 'draft' and OPEN: 'open'",
      );
      assert.match(
        content,
        /export type JobStatus\s*=/,
        "JobStatus type must be exported",
      );
    });

    test("1.2. types/job.ts defines JobCategory matching JobCategoryResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface JobCategory\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?description:\s*string\s*\|\s*null;[\s\S]*?\}/,
        "JobCategory interface must define id, name, and description: string | null",
      );
    });

    test("1.3. types/job.ts defines CreateDraftJobPostPayload matching CreateDraftJobPostInputDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface CreateDraftJobPostPayload\s*\{[\s\S]*?categoryId:\s*string;[\s\S]*?title:\s*string;[\s\S]*?description:\s*string;[\s\S]*?workType:\s*WorkType;[\s\S]*?paymentStructure:\s*PaymentStructure;[\s\S]*?\}/,
        "CreateDraftJobPostPayload must include required fields: categoryId, title, description, workType, paymentStructure",
      );

      assert.match(content, /skillIds\?:\s*string\[\];/);
      assert.match(content, /workersNeeded\?:\s*number;/);
      assert.match(content, /startDate\?:\s*string\s*\|\s*null;/);
      assert.match(content, /estimatedDuration\?:\s*string\s*\|\s*null;/);
      assert.match(content, /shiftDuration\?:\s*string\s*\|\s*null;/);
      assert.match(content, /jobLocation\?:\s*string\s*\|\s*null;/);
      assert.match(content, /jobLocationLat\?:\s*number\s*\|\s*null;/);
      assert.match(content, /jobLocationLng\?:\s*number\s*\|\s*null;/);
      assert.match(content, /budgetAmount\?:\s*number\s*\|\s*null;/);
      assert.match(content, /hourlyRate\?:\s*number\s*\|\s*null;/);
    });

    test("1.4. types/job.ts defines JobPost matching JobPostResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(content, /export interface JobPost\s*\{/);
      assert.match(content, /id:\s*string;/);
      assert.match(content, /recruiterId:\s*string;/);
      assert.match(content, /categoryId:\s*string;/);
      assert.match(content, /title:\s*string;/);
      assert.match(content, /description:\s*string;/);
      assert.match(content, /workType:\s*WorkType;/);
      assert.match(content, /workersNeeded:\s*number;/);
      assert.match(content, /paymentStructure:\s*PaymentStructure;/);
      assert.match(content, /status:\s*JobStatus;/);
      assert.match(content, /isBoosted:\s*boolean;/);
      assert.match(content, /boostExpiresAt:\s*string\s*\|\s*null;/);
      assert.match(content, /adminReviewStatus:\s*string;/);
      assert.match(content, /adminNotes:\s*string\s*\|\s*null;/);
      assert.match(content, /createdAt:\s*string;/);
      assert.match(content, /updatedAt:\s*string;/);
      assert.match(content, /category\?:\s*JobCategory;/);
      assert.match(content, /skills\?:\s*Skill\[\];/);
    });

    test("1.5. types/job.ts reuses Skill from ./worker-profile", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");
      assert.match(
        content,
        /import\s+type\s*\{\s*Skill\s*\}\s*from\s+["']\.\/worker-profile["']/,
        "types/job.ts must import Skill from ./worker-profile",
      );
    });
  });

  describe("2. Job Posting API Service Implementation & Invariants", () => {
    test("2.1. job-api.ts exists and exports getJobCategories, createDraftJobPost, publishJobPost", () => {
      assert.strictEqual(fs.existsSync(jobApiPath), true);
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(content, /export const getJobCategories\s*=/);
      assert.match(content, /export const createDraftJobPost\s*=/);
      assert.match(content, /export const publishJobPost\s*=/);
    });

    test("2.2. job-api.ts reuses existing shared api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");
      assert.match(
        content,
        /import\s+api\s+from\s+["']\.\/api["']/,
        "job-api.ts must import the shared api instance",
      );
      assert.strictEqual(
        content.includes("axios.create"),
        false,
        "job-api.ts must NOT create a new axios instance",
      );
    });

    test("2.3. job-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");
      assert.strictEqual(content.includes("localStorage"), false);
      assert.strictEqual(content.includes("sessionStorage"), false);
      assert.strictEqual(content.includes("Bearer"), false);
    });

    test("2.4. Endpoint routing matches verified backend contracts", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.get<JobCategory\[\]>\(["']\/job-categories["']\)/,
        "getJobCategories must call GET /job-categories",
      );

      assert.match(
        content,
        /api\.post<JobPost>\(["']\/recruiter\/jobs\/draft["'],\s*payload\)/,
        "createDraftJobPost must call POST /recruiter/jobs/draft with payload",
      );

      assert.match(
        content,
        /api\.patch<JobPost>\(\s*`\/recruiter\/jobs\/\$\{jobPostId\}\/publish`,\s*\)/,
        "publishJobPost must call PATCH /recruiter/jobs/:id/publish",
      );
    });

    test("2.5. job-api.ts returns response.data directly without manual envelope re-wrapping", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");
      // All functions must return response.data because the Axios interceptor unwraps ApiResponse.data
      const matches = content.match(/return response\.data;/g);
      assert.ok(
        (matches?.length ?? 0) >= 3,
        "Each of the API functions must return response.data directly",
      );
    });
  });

  describe("3. Skills API Reuse Verification", () => {
    test("3.1. worker-api.ts exports getSkillCatalog returning Promise<Skill[]>", () => {
      assert.strictEqual(fs.existsSync(workerApiPath), true);
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /export const getSkillCatalog\s*=\s*async\s*\(\):\s*Promise<Skill\[\]>/,
        "worker-api.ts must export getSkillCatalog returning Promise<Skill[]>",
      );
      assert.match(
        content,
        /api\.get<Skill\[\]>\(["']\/skills["']\)/,
        "getSkillCatalog must call GET /skills",
      );
    });

    test("3.2. worker-profile.ts exports Skill interface with id and name", () => {
      assert.strictEqual(fs.existsSync(workerTypesPath), true);
      const content = fs.readFileSync(workerTypesPath, "utf-8");

      assert.match(
        content,
        /export interface Skill\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?\}/,
        "Skill interface must have id: string and name: string",
      );
    });
  });
});
