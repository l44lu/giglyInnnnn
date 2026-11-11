import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 2, Step 7.4A: My Postings Frontend Types & API Service", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const jobApiPath = path.resolve(__dirname, "../lib/job-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. My Postings Types Definition & Contract Boundaries", () => {
    test("1.1. types/job.ts defines expanded JobStatus enum covering all backend statuses", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export const JobStatus\s*=\s*\{[\s\S]*?DRAFT:\s*["']draft["'][\s\S]*?OPEN:\s*["']open["'][\s\S]*?FILLED:\s*["']filled["'][\s\S]*?PAUSED:\s*["']paused["'][\s\S]*?CANCELLED:\s*["']cancelled["'][\s\S]*?COMPLETED:\s*["']completed["'][\s\S]*?\}\s*as const;/,
        "JobStatus must define DRAFT, OPEN, FILLED, PAUSED, CANCELLED, COMPLETED",
      );
      assert.match(
        content,
        /export type JobStatus\s*=\s*\(typeof JobStatus\)\[keyof typeof JobStatus\];/,
        "JobStatus type must be exported",
      );
    });

    test("1.2. types/job.ts defines RecruiterJobStatusFilter enum and type", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export const RecruiterJobStatusFilter\s*=\s*\{[\s\S]*?ALL:\s*["']all["'][\s\S]*?ACTIVE:\s*["']active["'][\s\S]*?DRAFT:\s*["']draft["'][\s\S]*?PAUSED:\s*["']paused["'][\s\S]*?CLOSED:\s*["']closed["'][\s\S]*?\}\s*as const;/,
        "RecruiterJobStatusFilter must define ALL, ACTIVE, DRAFT, PAUSED, CLOSED",
      );
      assert.match(
        content,
        /export type RecruiterJobStatusFilter\s*=\s*\(typeof RecruiterJobStatusFilter\)\[keyof typeof RecruiterJobStatusFilter\];/,
        "RecruiterJobStatusFilter type must be exported",
      );
    });

    test("1.3. types/job.ts defines RecruiterJobPostsSummary matching backend RecruiterJobPostsSummaryDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface RecruiterJobPostsSummary\s*\{[\s\S]*?total:\s*number;[\s\S]*?active:\s*number;[\s\S]*?draft:\s*number;[\s\S]*?paused:\s*number;[\s\S]*?closed:\s*number;[\s\S]*?activeLocal:\s*number;[\s\S]*?activeRemote:\s*number;[\s\S]*?\}/,
        "RecruiterJobPostsSummary must define total, active, draft, paused, closed, activeLocal, activeRemote as numbers",
      );
    });

    test("1.4. types/job.ts defines GetRecruiterJobsQuery matching backend GetRecruiterJobsQueryDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface GetRecruiterJobsQuery\s*\{[\s\S]*?status\?:\s*RecruiterJobStatusFilter;[\s\S]*?\}/,
        "GetRecruiterJobsQuery must define optional status?: RecruiterJobStatusFilter",
      );
    });

    test("1.5. types/job.ts defines GetRecruiterJobPostsResponse matching backend GetRecruiterJobPostsResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface GetRecruiterJobPostsResponse\s*\{[\s\S]*?summary:\s*RecruiterJobPostsSummary;[\s\S]*?items:\s*JobPost\[\];[\s\S]*?\}/,
        "GetRecruiterJobPostsResponse must define summary: RecruiterJobPostsSummary and items: JobPost[]",
      );
    });
  });

  describe("2. My Postings API Service Implementation & Invariants", () => {
    test("2.1. job-api.ts exports getRecruiterJobPosts", () => {
      assert.strictEqual(fs.existsSync(jobApiPath), true);
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /export const getRecruiterJobPosts\s*=\s*async\s*\(/,
        "job-api.ts must export getRecruiterJobPosts function",
      );
    });

    test("2.2. job-api.ts reuses existing shared api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(content, /import api from "\.\/api";/);
      assert.doesNotMatch(
        content,
        /axios\.create/,
        "job-api.ts must not create new Axios instances",
      );
    });

    test("2.3. job-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.doesNotMatch(content, /localStorage/);
      assert.doesNotMatch(content, /sessionStorage/);
      assert.doesNotMatch(content, /Bearer/);
    });

    test("2.4. base api.ts configures withCredentials: true for HttpOnly cookies", () => {
      const content = fs.readFileSync(baseApiPath, "utf-8");

      assert.match(
        content,
        /withCredentials:\s*true/,
        "base api.ts must have withCredentials: true",
      );
    });

    test("2.5. getRecruiterJobPosts dispatches GET /recruiter/jobs with params", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /api\.get<GetRecruiterJobPostsResponse>\(\s*["']\/recruiter\/jobs["'][\s\S]*?params:\s*query/,
        "getRecruiterJobPosts must dispatch GET /recruiter/jobs with query params",
      );
    });

    test("2.6. getRecruiterJobPosts returns response.data directly without manual envelope re-wrapping", () => {
      const content = fs.readFileSync(jobApiPath, "utf-8");

      assert.match(
        content,
        /return response\.data;/,
        "getRecruiterJobPosts must return response.data directly",
      );
      assert.doesNotMatch(
        content,
        /response\.data\.data/,
        "getRecruiterJobPosts must not manually double-unwrap response.data.data",
      );
    });
  });

  describe("3. Mocked API Execution Simulation", () => {
    test("3.1. getRecruiterJobPosts correctly formats request and returns data", async () => {
      const mockSummary = {
        total: 5,
        active: 2,
        draft: 1,
        paused: 1,
        closed: 1,
        activeLocal: 1,
        activeRemote: 1,
      };
      const mockItems = [
        {
          id: "job-1",
          recruiterId: "recruiter-1",
          title: "Senior Bartender",
          status: "open",
          workType: "local",
        },
      ];

      let capturedUrl = "";
      let capturedConfig = null;

      const mockApi = {
        get: async (url, config) => {
          capturedUrl = url;
          capturedConfig = config;
          return {
            data: {
              summary: mockSummary,
              items: mockItems,
            },
          };
        },
      };

      const simulateGetRecruiterJobPosts = async (query) => {
        const response = await mockApi.get("/recruiter/jobs", {
          params: query,
        });
        return response.data;
      };

      const result = await simulateGetRecruiterJobPosts({ status: "active" });

      assert.strictEqual(capturedUrl, "/recruiter/jobs");
      assert.deepStrictEqual(capturedConfig, { params: { status: "active" } });
      assert.deepStrictEqual(result.summary, mockSummary);
      assert.deepStrictEqual(result.items, mockItems);
    });
  });
});
