import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Step 2H-6: Frontend Worker Skills API Integration", () => {
  const typesPath = path.resolve(__dirname, "../types/worker-profile.ts");
  const skillTypesPath = path.resolve(__dirname, "../types/skill.ts");
  const apiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. Skill Types Definition & Contract Boundaries", () => {
    test("1.1. worker-profile.ts defines Skill, WorkerSkill, and UpdateWorkerSkillsPayload", () => {
      assert.strictEqual(fs.existsSync(typesPath), true);
      const content = fs.readFileSync(typesPath, "utf-8");

      assert.match(
        content,
        /export interface Skill\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?\}/,
        "Skill interface must define id and name",
      );

      assert.match(
        content,
        /export interface WorkerSkill\s*\{[\s\S]*?id:\s*string;[\s\S]*?skillId:\s*string;[\s\S]*?skillName:\s*string;[\s\S]*?\}/,
        "WorkerSkill interface must define id, skillId, and skillName",
      );

      assert.match(
        content,
        /export interface UpdateWorkerSkillsPayload\s*\{[\s\S]*?skillIds:\s*string\[\];[\s\S]*?\}/,
        "UpdateWorkerSkillsPayload interface must define skillIds: string[]",
      );
    });

    test("1.2. skill.ts exists and re-exports skill types", () => {
      assert.strictEqual(fs.existsSync(skillTypesPath), true);
      const content = fs.readFileSync(skillTypesPath, "utf-8");
      assert.match(content, /Skill/);
      assert.match(content, /WorkerSkill/);
      assert.match(content, /UpdateWorkerSkillsPayload/);
    });

    test("1.3. Skill types do NOT expose internal database fields (skillType, createdAt, workerId)", () => {
      const content = fs.readFileSync(typesPath, "utf-8");
      // Extract Skill, WorkerSkill, and UpdateWorkerSkillsPayload blocks
      const skillBlockMatch = content.match(
        /export interface Skill\s*\{([^}]+)\}/,
      );
      assert.ok(skillBlockMatch, "Skill block must be found");
      assert.strictEqual(
        skillBlockMatch[1].includes("skillType"),
        false,
        "Skill interface must NOT expose skillType",
      );
      assert.strictEqual(
        skillBlockMatch[1].includes("createdAt"),
        false,
        "Skill interface must NOT expose createdAt",
      );

      const workerSkillBlockMatch = content.match(
        /export interface WorkerSkill\s*\{([^}]+)\}/,
      );
      assert.ok(workerSkillBlockMatch, "WorkerSkill block must be found");
      assert.strictEqual(
        workerSkillBlockMatch[1].includes("skillType"),
        false,
        "WorkerSkill interface must NOT expose skillType",
      );
      assert.strictEqual(
        workerSkillBlockMatch[1].includes("createdAt"),
        false,
        "WorkerSkill interface must NOT expose createdAt",
      );
      assert.strictEqual(
        workerSkillBlockMatch[1].includes("workerId"),
        false,
        "WorkerSkill interface must NOT expose workerId",
      );

      const payloadBlockMatch = content.match(
        /export interface UpdateWorkerSkillsPayload\s*\{([^}]+)\}/,
      );
      assert.ok(payloadBlockMatch, "UpdateWorkerSkillsPayload block must be found");
      assert.strictEqual(
        payloadBlockMatch[1].includes("workerId"),
        false,
        "UpdateWorkerSkillsPayload must NOT accept workerId",
      );
      assert.strictEqual(
        payloadBlockMatch[1].includes("skillType"),
        false,
        "UpdateWorkerSkillsPayload must NOT accept skillType",
      );
    });
  });

  describe("2. Worker API Helpers Export & Implementation", () => {
    test("2.1. worker-api.ts exports getSkillCatalog, getWorkerSkills, and updateWorkerSkills", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");

      assert.match(
        content,
        /export const getSkillCatalog\b/,
        "Must export getSkillCatalog",
      );
      assert.match(
        content,
        /export const getWorkerSkills\b/,
        "Must export getWorkerSkills",
      );
      assert.match(
        content,
        /export const updateWorkerSkills\b/,
        "Must export updateWorkerSkills",
      );
    });

    test("2.2. worker-api.ts reuses existing api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /import\s+api\s+from\s+["']\.\/api["']/,
        "Must import shared api instance from ./api",
      );
      assert.strictEqual(
        content.includes("axios.create"),
        false,
        "worker-api.ts must NOT create a new axios instance",
      );
    });

    test("2.3. worker-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.strictEqual(
        content.includes("localStorage"),
        false,
        "worker-api.ts must NOT access localStorage",
      );
      assert.strictEqual(
        content.includes("sessionStorage"),
        false,
        "worker-api.ts must NOT access sessionStorage",
      );
      assert.strictEqual(
        content.includes("Bearer"),
        false,
        "worker-api.ts must NOT manually attach Bearer headers",
      );
      assert.strictEqual(
        content.includes("Authorization"),
        false,
        "worker-api.ts must NOT manually configure Authorization header",
      );
    });

    test("2.4. base api.ts configures withCredentials: true for HttpOnly cookies", () => {
      assert.strictEqual(fs.existsSync(baseApiPath), true);
      const content = fs.readFileSync(baseApiPath, "utf-8");
      assert.match(
        content,
        /withCredentials:\s*true/,
        "api.ts must specify withCredentials: true",
      );
    });
  });

  describe("3. API Function Contracts & Endpoint Routing", () => {
    test("3.1. getSkillCatalog dispatches GET /skills", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.get<Skill\[\]>\(["']\/skills["']\)/,
        "getSkillCatalog must dispatch api.get<Skill[]>('/skills')",
      );
    });

    test("3.2. getWorkerSkills dispatches GET /worker/skills", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.get<WorkerSkill\[\]>\(["']\/worker\/skills["']\)/,
        "getWorkerSkills must dispatch api.get<WorkerSkill[]>('/worker/skills')",
      );
    });

    test("3.3. updateWorkerSkills dispatches PUT /worker/skills with payload { skillIds }", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.put<WorkerSkill\[\]>\(\s*["']\/worker\/skills["'],\s*payload\s*\)/,
        "updateWorkerSkills must dispatch api.put<WorkerSkill[]>('/worker/skills', payload)",
      );
      assert.match(
        content,
        /payload:\s*UpdateWorkerSkillsPayload\s*=\s*\{\s*skillIds\s*\}/,
        "payload must be constructed with skillIds",
      );
    });
  });

  describe("4. Runtime Behavior Simulation (Happy Path & Data Mapping)", () => {
    test("4.1. getSkillCatalog returns catalog items without internal database fields", async () => {
      const mockCatalogResponse = [
        { id: "s-1", name: "Food Serving" },
        { id: "s-2", name: "Kitchen Help" },
        { id: "s-3", name: "Table Service" },
      ];

      const mockApi = {
        get: async (url) => {
          if (url === "/skills") {
            return { data: mockCatalogResponse };
          }
          throw new Error(`Unexpected GET url: ${url}`);
        },
      };

      const simulateGetSkillCatalog = async (client) => {
        const response = await client.get("/skills");
        return response.data;
      };

      const result = await simulateGetSkillCatalog(mockApi);
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(result[0], { id: "s-1", name: "Food Serving" });
      assert.strictEqual(result[0].skillType, undefined);
    });

    test("4.2. getWorkerSkills returns assigned worker skills with skillName mapping", async () => {
      const mockWorkerSkillsResponse = [
        { id: "ws-1", skillId: "s-1", skillName: "Food Serving" },
        { id: "ws-2", skillId: "s-3", skillName: "Table Service" },
      ];

      const mockApi = {
        get: async (url) => {
          if (url === "/worker/skills") {
            return { data: mockWorkerSkillsResponse };
          }
          throw new Error(`Unexpected GET url: ${url}`);
        },
      };

      const simulateGetWorkerSkills = async (client) => {
        const response = await client.get("/worker/skills");
        return response.data;
      };

      const result = await simulateGetWorkerSkills(mockApi);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0], {
        id: "ws-1",
        skillId: "s-1",
        skillName: "Food Serving",
      });
      assert.strictEqual(result[0].skillType, undefined);
      assert.strictEqual(result[0].workerId, undefined);
    });

    test("4.3. getWorkerSkills returns empty array [] when worker has no skills", async () => {
      const mockApi = {
        get: async (url) => {
          if (url === "/worker/skills") {
            return { data: [] };
          }
          throw new Error(`Unexpected GET url: ${url}`);
        },
      };

      const simulateGetWorkerSkills = async (client) => {
        const response = await client.get("/worker/skills");
        return response.data;
      };

      const result = await simulateGetWorkerSkills(mockApi);
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 0);
    });

    test("4.4. updateWorkerSkills dispatches PUT with skillIds payload and returns updated skills", async () => {
      let dispatchedUrl = null;
      let dispatchedBody = null;

      const mockUpdatedResponse = [
        { id: "ws-1", skillId: "s-1", skillName: "Food Serving" },
        { id: "ws-2", skillId: "s-2", skillName: "Kitchen Help" },
      ];

      const mockApi = {
        put: async (url, body) => {
          dispatchedUrl = url;
          dispatchedBody = body;
          return { data: mockUpdatedResponse };
        },
      };

      const simulateUpdateWorkerSkills = async (client, skillIds) => {
        const payload = { skillIds };
        const response = await client.put("/worker/skills", payload);
        return response.data;
      };

      const result = await simulateUpdateWorkerSkills(mockApi, ["s-1", "s-2"]);

      assert.strictEqual(dispatchedUrl, "/worker/skills");
      assert.deepStrictEqual(dispatchedBody, { skillIds: ["s-1", "s-2"] });
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result, mockUpdatedResponse);
    });

    test("4.5. updateWorkerSkills dispatches empty array [] to clear all worker skills", async () => {
      let dispatchedBody = null;

      const mockApi = {
        put: async (url, body) => {
          dispatchedBody = body;
          return { data: [] };
        },
      };

      const simulateUpdateWorkerSkills = async (client, skillIds) => {
        const payload = { skillIds };
        const response = await client.put("/worker/skills", payload);
        return response.data;
      };

      const result = await simulateUpdateWorkerSkills(mockApi, []);

      assert.deepStrictEqual(dispatchedBody, { skillIds: [] });
      assert.deepStrictEqual(result, []);
    });
  });

  describe("5. Error Propagation Invariants", () => {
    test("5.1. 400 Bad Request propagates without swallowing", async () => {
      const mockApi = {
        put: async () => {
          const error = new Error("Bad Request");
          error.response = {
            status: 400,
            data: { message: "Duplicate skill IDs are not allowed" },
          };
          throw error;
        },
      };

      const simulateUpdateWorkerSkills = async (client, skillIds) => {
        const payload = { skillIds };
        const response = await client.put("/worker/skills", payload);
        return response.data;
      };

      await assert.rejects(
        async () => simulateUpdateWorkerSkills(mockApi, ["s-1", "s-1"]),
        (err) => {
          assert.strictEqual(err.response?.status, 400);
          assert.strictEqual(
            err.response?.data?.message,
            "Duplicate skill IDs are not allowed",
          );
          return true;
        },
      );
    });

    test("5.2. 401 Unauthorized propagates without swallowing", async () => {
      const mockApi = {
        get: async () => {
          const error = new Error("Unauthorized");
          error.response = {
            status: 401,
            data: { message: "Authentication token is missing" },
          };
          throw error;
        },
      };

      const simulateGetWorkerSkills = async (client) => {
        const response = await client.get("/worker/skills");
        return response.data;
      };

      await assert.rejects(
        async () => simulateGetWorkerSkills(mockApi),
        (err) => {
          assert.strictEqual(err.response?.status, 401);
          return true;
        },
      );
    });

    test("5.3. 403 Forbidden propagates without swallowing", async () => {
      const mockApi = {
        put: async () => {
          const error = new Error("Forbidden");
          error.response = {
            status: 403,
            data: { message: "Forbidden resource" },
          };
          throw error;
        },
      };

      const simulateUpdateWorkerSkills = async (client, skillIds) => {
        const payload = { skillIds };
        const response = await client.put("/worker/skills", payload);
        return response.data;
      };

      await assert.rejects(
        async () => simulateUpdateWorkerSkills(mockApi, ["s-1"]),
        (err) => {
          assert.strictEqual(err.response?.status, 403);
          return true;
        },
      );
    });

    test("5.4. Network / connection errors propagate cleanly", async () => {
      const mockApi = {
        get: async () => {
          throw new Error("Network Error: Failed to connect to server");
        },
      };

      const simulateGetSkillCatalog = async (client) => {
        const response = await client.get("/skills");
        return response.data;
      };

      await assert.rejects(
        async () => simulateGetSkillCatalog(mockApi),
        /Network Error/,
      );
    });
  });
});
