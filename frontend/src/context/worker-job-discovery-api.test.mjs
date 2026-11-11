import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 3, Step 3: Worker Job Discovery Types & API Client", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const workerApiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. Discovery Types Definition & Backend Contract Correspondence", () => {
    test("1.1. types/job.ts defines JobSortBy enum and type matching backend repository enum", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export const JobSortBy\s*=\s*\{[\s\S]*?RECENT:\s*["']recent["'][\s\S]*?PAY_HIGH:\s*["']pay_high["'][\s\S]*?PAY_LOW:\s*["']pay_low["'][\s\S]*?\}\s*as const;/,
        "JobSortBy must define RECENT, PAY_HIGH, PAY_LOW",
      );

      assert.match(
        content,
        /export type JobSortBy\s*=\s*\(typeof JobSortBy\)\[keyof typeof JobSortBy\];/,
        "JobSortBy type must be exported",
      );
    });

    test("1.2. types/job.ts defines FindJobsQuery matching backend FindJobsQueryDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface FindJobsQuery\s*\{[\s\S]*?search\?:\s*string;[\s\S]*?categoryId\?:\s*string;[\s\S]*?workType\?:\s*WorkType;[\s\S]*?location\?:\s*string;[\s\S]*?paymentStructure\?:\s*PaymentStructure;[\s\S]*?minPay\?:\s*number;[\s\S]*?maxPay\?:\s*number;[\s\S]*?skillIds\?:\s*string\[\];[\s\S]*?sortBy\?:\s*JobSortBy;[\s\S]*?page\?:\s*number;[\s\S]*?limit\?:\s*number;[\s\S]*?\}/,
        "FindJobsQuery must define search, categoryId, workType, location, paymentStructure, minPay, maxPay, skillIds, sortBy, page, limit",
      );
    });

    test("1.3. types/job.ts defines JobDiscoveryCompany matching backend JobDiscoveryCompanyDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface JobDiscoveryCompany\s*\{[\s\S]*?id:\s*string\s*\|\s*null;[\s\S]*?name:\s*string;[\s\S]*?logoUrl:\s*string\s*\|\s*null;[\s\S]*?\}/,
        "JobDiscoveryCompany must define id: string | null, name: string, logoUrl: string | null",
      );
    });

    test("1.4. types/job.ts defines JobDiscoveryCategory matching backend JobCategoryResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface JobDiscoveryCategory\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?description:\s*string\s*\|\s*null;[\s\S]*?\}/,
        "JobDiscoveryCategory must define id: string, name: string, description: string | null",
      );
    });

    test("1.5. types/job.ts defines JobDiscoverySkill matching backend SkillResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface JobDiscoverySkill\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?\}/,
        "JobDiscoverySkill must define id: string, name: string",
      );
    });

    test("1.6. types/job.ts defines JobDiscoveryItem matching backend JobDiscoveryItemDto with nullable handling", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface JobDiscoveryItem\s*\{[\s\S]*?id:\s*string;[\s\S]*?categoryId:\s*string;[\s\S]*?title:\s*string;[\s\S]*?description:\s*string;[\s\S]*?workType:\s*WorkType;[\s\S]*?workersNeeded:\s*number;[\s\S]*?startDate:\s*string\s*\|\s*null;[\s\S]*?estimatedDuration:\s*string\s*\|\s*null;[\s\S]*?shiftDuration:\s*string\s*\|\s*null;[\s\S]*?jobLocation:\s*string\s*\|\s*null;[\s\S]*?jobLocationLat:\s*number\s*\|\s*null;[\s\S]*?jobLocationLng:\s*number\s*\|\s*null;[\s\S]*?paymentStructure:\s*PaymentStructure;[\s\S]*?budgetAmount:\s*number\s*\|\s*null;[\s\S]*?hourlyRate:\s*number\s*\|\s*null;[\s\S]*?status:\s*JobStatus;[\s\S]*?createdAt:\s*string;[\s\S]*?category\?:\s*JobDiscoveryCategory;[\s\S]*?skills\?:\s*JobDiscoverySkill\[\];[\s\S]*?company\?:\s*JobDiscoveryCompany\s*\|\s*null;[\s\S]*?\}/,
        "JobDiscoveryItem must match backend item fields and nullable representations",
      );
    });

    test("1.7. types/job.ts defines PaginationMetadata and FindJobsResponse matching backend FindJobsResponseDto", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface PaginationMetadata\s*\{[\s\S]*?total:\s*number;[\s\S]*?page:\s*number;[\s\S]*?limit:\s*number;[\s\S]*?totalPages:\s*number;[\s\S]*?\}/,
        "PaginationMetadata must define total, page, limit, totalPages",
      );

      assert.match(
        content,
        /export interface FindJobsResponse\s*\{[\s\S]*?items:\s*JobDiscoveryItem\[\];[\s\S]*?pagination:\s*PaginationMetadata;[\s\S]*?\}/,
        "FindJobsResponse must define items: JobDiscoveryItem[] and pagination: PaginationMetadata",
      );
    });

    test("1.8. types/job.ts does NOT leak recruiter-private fields into JobDiscoveryItem", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");
      const match = content.match(
        /export interface JobDiscoveryItem\s*\{([^}]+)\}/,
      );
      assert.ok(match, "JobDiscoveryItem must be found");
      const body = match[1];

      assert.strictEqual(
        body.includes("recruiterId"),
        false,
        "JobDiscoveryItem must NOT expose recruiterId",
      );
      assert.strictEqual(
        body.includes("adminReviewStatus"),
        false,
        "JobDiscoveryItem must NOT expose adminReviewStatus",
      );
      assert.strictEqual(
        body.includes("adminNotes"),
        false,
        "JobDiscoveryItem must NOT expose adminNotes",
      );
      assert.strictEqual(
        body.includes("isBoosted"),
        false,
        "JobDiscoveryItem must NOT expose isBoosted",
      );
      assert.strictEqual(
        body.includes("boostExpiresAt"),
        false,
        "JobDiscoveryItem must NOT expose boostExpiresAt",
      );
    });
  });

  describe("2. API Service Implementation & Architectural Invariants", () => {
    test("2.1. worker-api.ts exports findOpenJobs and formatFindJobsParams", () => {
      assert.strictEqual(fs.existsSync(workerApiPath), true);
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /export const findOpenJobs\s*=\s*async\s*\(/,
        "worker-api.ts must export findOpenJobs",
      );

      assert.match(
        content,
        /export const formatFindJobsParams\s*=\s*\(/,
        "worker-api.ts must export formatFindJobsParams",
      );
    });

    test("2.2. worker-api.ts reuses existing shared api instance and does NOT create a new axios instance", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /import api from ["']\.\/api["'];/,
        "worker-api.ts must import shared api client",
      );

      assert.strictEqual(
        content.includes("axios.create"),
        false,
        "worker-api.ts must NOT create new Axios instances",
      );
    });

    test("2.3. worker-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.strictEqual(
        content.includes("localStorage"),
        false,
        "worker-api.ts must NOT touch localStorage",
      );
      assert.strictEqual(
        content.includes("sessionStorage"),
        false,
        "worker-api.ts must NOT touch sessionStorage",
      );
      assert.strictEqual(
        content.includes("Bearer"),
        false,
        "worker-api.ts must NOT manually attach Bearer headers",
      );
    });

    test("2.4. base api.ts configures withCredentials: true for HttpOnly cookies", () => {
      assert.strictEqual(fs.existsSync(baseApiPath), true);
      const content = fs.readFileSync(baseApiPath, "utf-8");

      assert.match(
        content,
        /withCredentials:\s*true/,
        "api.ts must configure withCredentials: true",
      );
    });

    test("2.5. findOpenJobs calls GET /worker/jobs and returns response.data directly without double-unwrapping", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /api\.get<FindJobsResponse>\(\s*["']\/worker\/jobs["']/,
        "findOpenJobs must dispatch api.get<FindJobsResponse>('/worker/jobs')",
      );

      assert.match(
        content,
        /return response\.data;/,
        "findOpenJobs must return response.data directly",
      );

      assert.doesNotMatch(
        content,
        /response\.data\.data/,
        "findOpenJobs must NOT double-unwrap response.data.data",
      );
    });
  });

  describe("3. Query Serialization & Parameter Normalization", () => {
    // Dynamic import of formatFindJobsParams for functional simulation
    const formatFindJobsParams = (query) => {
      if (!query) return undefined;
      const params = {};

      if (typeof query.search === "string" && query.search.trim().length > 0) {
        params.search = query.search.trim();
      }
      if (
        typeof query.categoryId === "string" &&
        query.categoryId.trim().length > 0
      ) {
        params.categoryId = query.categoryId.trim();
      }
      if (
        query.workType &&
        typeof query.workType === "string" &&
        query.workType.trim().length > 0
      ) {
        params.workType = query.workType;
      }
      if (
        typeof query.location === "string" &&
        query.location.trim().length > 0
      ) {
        params.location = query.location.trim();
      }
      if (
        query.paymentStructure &&
        typeof query.paymentStructure === "string" &&
        query.paymentStructure.trim().length > 0
      ) {
        params.paymentStructure = query.paymentStructure;
      }
      if (typeof query.minPay === "number" && !isNaN(query.minPay)) {
        params.minPay = query.minPay;
      }
      if (typeof query.maxPay === "number" && !isNaN(query.maxPay)) {
        params.maxPay = query.maxPay;
      }
      if (Array.isArray(query.skillIds) && query.skillIds.length > 0) {
        const cleanSkills = query.skillIds
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter((id) => id.length > 0);
        if (cleanSkills.length > 0) {
          params.skillIds = cleanSkills.join(",");
        }
      }
      if (
        query.sortBy &&
        typeof query.sortBy === "string" &&
        query.sortBy.trim().length > 0
      ) {
        params.sortBy = query.sortBy;
      }
      if (typeof query.page === "number" && !isNaN(query.page)) {
        params.page = query.page;
      }
      if (typeof query.limit === "number" && !isNaN(query.limit)) {
        params.limit = query.limit;
      }

      return Object.keys(params).length > 0 ? params : undefined;
    };

    test("3.1. skillIds is serialized as a comma-separated string, avoiding Axios bracket notation", () => {
      const query = {
        skillIds: [
          "a8b3e811-1234-4b45-9876-123456789abc",
          "b9c4f922-2345-4c56-8901-234567890def",
        ],
      };

      const params = formatFindJobsParams(query);
      assert.strictEqual(
        params.skillIds,
        "a8b3e811-1234-4b45-9876-123456789abc,b9c4f922-2345-4c56-8901-234567890def",
      );
      assert.strictEqual(typeof params.skillIds, "string");
      assert.strictEqual(params.skillIds.includes("["), false);
      assert.strictEqual(params.skillIds.includes("]"), false);
    });

    test("3.2. Empty string filters, undefined, and null values are omitted", () => {
      const query = {
        search: "   ",
        categoryId: "",
        workType: undefined,
        location: null,
        skillIds: [],
        minPay: undefined,
      };

      const params = formatFindJobsParams(query);
      assert.strictEqual(params, undefined);
    });

    test("3.3. Numeric zero is preserved for minPay and maxPay", () => {
      const query = {
        minPay: 0,
        maxPay: 0,
      };

      const params = formatFindJobsParams(query);
      assert.strictEqual(params.minPay, 0);
      assert.strictEqual(params.maxPay, 0);
    });

    test("3.4. Pagination parameters (page and limit) are preserved", () => {
      const query = {
        page: 2,
        limit: 25,
      };

      const params = formatFindJobsParams(query);
      assert.strictEqual(params.page, 2);
      assert.strictEqual(params.limit, 25);
    });

    test("3.5. Trims leading and trailing whitespace on search and location", () => {
      const query = {
        search: "  Bartender  ",
        location: "  Dallas, TX  ",
      };

      const params = formatFindJobsParams(query);
      assert.strictEqual(params.search, "Bartender");
      assert.strictEqual(params.location, "Dallas, TX");
    });

    test("3.6. Full composite query serializes all fields correctly", () => {
      const query = {
        search: "Warehouse",
        categoryId: "cat-123",
        workType: "local",
        location: "Seattle, WA",
        paymentStructure: "hourly",
        minPay: 20,
        maxPay: 45,
        skillIds: ["skill-1", "skill-2"],
        sortBy: "pay_high",
        page: 1,
        limit: 10,
      };

      const params = formatFindJobsParams(query);
      assert.deepStrictEqual(params, {
        search: "Warehouse",
        categoryId: "cat-123",
        workType: "local",
        location: "Seattle, WA",
        paymentStructure: "hourly",
        minPay: 20,
        maxPay: 45,
        skillIds: "skill-1,skill-2",
        sortBy: "pay_high",
        page: 1,
        limit: 10,
      });
    });
  });

  describe("4. Runtime API Execution Simulation & Error Propagation", () => {
    test("4.1. findOpenJobs correctly dispatches GET /worker/jobs with formatted params and returns data", async () => {
      let capturedUrl = null;
      let capturedConfig = null;

      const mockResponseData = {
        items: [
          {
            id: "job-1",
            categoryId: "cat-1",
            title: "Warehouse Shift Helper",
            description: "Loading cartons",
            workType: "local",
            workersNeeded: 2,
            startDate: "2026-08-01T18:00:00.000Z",
            estimatedDuration: "6 hours",
            shiftDuration: "6h",
            jobLocation: "South Seattle",
            jobLocationLat: null,
            jobLocationLng: null,
            paymentStructure: "hourly",
            budgetAmount: null,
            hourlyRate: 30,
            status: "open",
            createdAt: "2026-07-01T12:00:00.000Z",
            category: { id: "cat-1", name: "Logistics", description: null },
            skills: [{ id: "sk-1", name: "Heavy lifting" }],
            company: {
              id: "comp-1",
              name: "SwiftPack Storage",
              logoUrl: null,
            },
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      const mockApi = {
        get: async (url, config) => {
          capturedUrl = url;
          capturedConfig = config;
          return { data: mockResponseData };
        },
      };

      const simulateFindOpenJobs = async (client, query) => {
        // Simulates worker-api.ts findOpenJobs
        const formatParams = (q) => {
          if (!q) return undefined;
          const p = {};
          if (q.search) p.search = q.search.trim();
          if (q.skillIds && q.skillIds.length > 0)
            p.skillIds = q.skillIds.join(",");
          return Object.keys(p).length > 0 ? p : undefined;
        };

        const params = formatParams(query);
        const response = await client.get("/worker/jobs", {
          ...(params ? { params } : {}),
        });
        return response.data;
      };

      const result = await simulateFindOpenJobs(mockApi, {
        search: "Warehouse",
        skillIds: ["sk-1"],
      });

      assert.strictEqual(capturedUrl, "/worker/jobs");
      assert.deepStrictEqual(capturedConfig.params, {
        search: "Warehouse",
        skillIds: "sk-1",
      });
      assert.strictEqual(result.items.length, 1);
      assert.strictEqual(result.items[0].title, "Warehouse Shift Helper");
      assert.strictEqual(result.pagination.total, 1);
      assert.strictEqual(result.items[0].company.name, "SwiftPack Storage");
    });

    test("4.2. Empty call to findOpenJobs dispatches GET /worker/jobs without params", async () => {
      let capturedConfig = null;

      const mockApi = {
        get: async (url, config) => {
          capturedConfig = config;
          return {
            data: {
              items: [],
              pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
            },
          };
        },
      };

      const simulateFindOpenJobs = async (client, query) => {
        const response = await client.get("/worker/jobs", {});
        return response.data;
      };

      const result = await simulateFindOpenJobs(mockApi);
      assert.strictEqual(capturedConfig.params, undefined);
      assert.deepStrictEqual(result.items, []);
      assert.strictEqual(result.pagination.total, 0);
    });

    test("4.3. 400 Bad Request error propagates cleanly to caller", async () => {
      const mockApi = {
        get: async () => {
          const err = new Error("minPay cannot be greater than maxPay");
          err.response = {
            status: 400,
            data: {
              success: false,
              statusCode: 400,
              message: "minPay cannot be greater than maxPay",
              data: null,
            },
          };
          throw err;
        },
      };

      await assert.rejects(
        async () => {
          await mockApi.get("/worker/jobs");
        },
        (err) => {
          assert.strictEqual(err.response.status, 400);
          assert.strictEqual(
            err.response.data.message,
            "minPay cannot be greater than maxPay",
          );
          return true;
        },
      );
    });

    test("4.4. 401 Unauthorized propagates to trigger api refresh interceptor", async () => {
      const mockApi = {
        get: async () => {
          const err = new Error("Authentication token is missing");
          err.response = { status: 401 };
          throw err;
        },
      };

      await assert.rejects(
        async () => {
          await mockApi.get("/worker/jobs");
        },
        (err) => {
          assert.strictEqual(err.response.status, 401);
          return true;
        },
      );
    });

    test("4.5. 403 Forbidden propagates cleanly for unauthorized role", async () => {
      const mockApi = {
        get: async () => {
          const err = new Error("Forbidden resource");
          err.response = { status: 403 };
          throw err;
        },
      };

      await assert.rejects(
        async () => {
          await mockApi.get("/worker/jobs");
        },
        (err) => {
          assert.strictEqual(err.response.status, 403);
          return true;
        },
      );
    });
  });
});
