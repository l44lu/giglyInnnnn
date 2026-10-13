import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory localStorage mock for node environment
let store = new Map();
const localStorageMock = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.localStorage = localStorageMock;

// Import the real api and helper functions
const {
  api,
  isApiResponse,
} = await import("../lib/api.ts");

describe("STEP 5: Common API Response Model - Frontend Integration", () => {
  const typesPath = path.resolve(__dirname, "../types/api.ts");
  const apiPath = path.resolve(__dirname, "../lib/api.ts");
  const authApiPath = path.resolve(__dirname, "../lib/auth-api.ts");
  const adminApiPath = path.resolve(__dirname, "../lib/admin-api.ts");
  const workerApiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const recruiterApiPath = path.resolve(__dirname, "../lib/recruiter-api.ts");

  beforeEach(() => {
    store.clear();
  });

  // Helper to create an AxiosError
  const createAxiosError = (status, data, config) => {
    return new axios.AxiosError(
      data?.message || "Request failed",
      `ERR_BAD_RESPONSE_${status}`,
      config,
      null,
      {
        status,
        statusText: status === 401 ? "Unauthorized" : status === 400 ? "Bad Request" : "Error",
        headers: { "content-type": "application/json" },
        config,
        data,
      },
    );
  };

  // =========================================================================
  // GROUP 1: Static Contract & Architecture Verification
  // =========================================================================

  describe("1. Static Contract & Envelope Definitions", () => {
    test("1.1. types/api.ts defines ApiResponse<T> and ApiErrorResponse interfaces", () => {
      assert.strictEqual(fs.existsSync(typesPath), true, "types/api.ts must exist");
      const content = fs.readFileSync(typesPath, "utf-8");

      assert.match(
        content,
        /export interface ApiResponse<T = unknown>\s*\{[\s\S]*?success:\s*boolean;[\s\S]*?statusCode:\s*number;[\s\S]*?message:\s*string;[\s\S]*?data:\s*T;[\s\S]*?\}/,
        "ApiResponse<T> must define success, statusCode, message, and data",
      );

      assert.match(
        content,
        /export interface ApiErrorResponse\s*\{[\s\S]*?success:\s*false;[\s\S]*?statusCode:\s*number;[\s\S]*?message:\s*string;[\s\S]*?errors\?:\s*string\[\];[\s\S]*?data:\s*null;[\s\S]*?\}/,
        "ApiErrorResponse must define success: false, statusCode, message, optional errors: string[], and data: null",
      );
    });

    test("1.2. lib/api.ts imports isApiResponse and avoids naive 'data' in response.data check", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /import\s*\{\s*isApiResponse\s*\}\s*from\s*["']\.\.\/types\/api(?:\.ts)?["']/,
        "lib/api.ts must import isApiResponse from types/api",
      );

      // Verify no naive property checking without type guard
      assert.strictEqual(
        content.includes('response.data && "data" in response.data && !isApiResponse'),
        false,
        "api.ts must not use naive 'data in response.data' check",
      );
    });

    test("1.3. lib/api.ts preserves binary responses (blob, arraybuffer, stream)", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(content, /response\.config\.responseType === ["']blob["']/);
      assert.match(content, /response\.config\.responseType === ["']arraybuffer["']/);
      assert.match(content, /response\.config\.responseType === ["']stream["']/);
      assert.match(content, /response\.data instanceof Blob/);
      assert.match(content, /response\.data instanceof ArrayBuffer/);
    });

    test("1.4. Existing service return types remain clean domain types (not wrapped in ApiResponse)", () => {
      const adminContent = fs.readFileSync(adminApiPath, "utf-8");
      assert.match(
        adminContent,
        /export const getAdminUsers\s*=\s*async\s*\(\):\s*Promise<AdminUser\[\]>/,
        "getAdminUsers must continue returning Promise<AdminUser[]>",
      );
      assert.match(
        adminContent,
        /export const getAdminUser\s*=\s*async\s*\(userId:\s*string\):\s*Promise<AdminUser>/,
        "getAdminUser must continue returning Promise<AdminUser>",
      );

      const workerContent = fs.readFileSync(workerApiPath, "utf-8");
      assert.match(
        workerContent,
        /export const getWorkerProfile\s*=\s*async\s*\(\):\s*Promise<WorkerProfileResponse\s*\|\s*null>/,
        "getWorkerProfile must continue returning Promise<WorkerProfileResponse | null>",
      );
      assert.match(
        workerContent,
        /export const getSkillCatalog\s*=\s*async\s*\(\):\s*Promise<Skill\[\]>/,
        "getSkillCatalog must continue returning Promise<Skill[]>",
      );
      assert.match(
        workerContent,
        /export const getWorkerSkills\s*=\s*async\s*\(\):\s*Promise<WorkerSkill\[\]>/,
        "getWorkerSkills must continue returning Promise<WorkerSkill[]>",
      );

      const recruiterContent = fs.readFileSync(recruiterApiPath, "utf-8");
      assert.match(
        recruiterContent,
        /export const getRecruiterCompany\s*=\s*async\s*\(\):\s*Promise<Company\s*\|\s*null>/,
        "getRecruiterCompany must continue returning Promise<Company | null>",
      );

      const authContent = fs.readFileSync(authApiPath, "utf-8");
      assert.match(
        authContent,
        /export const forgotPassword\s*=\s*async\s*\([\s\S]*?\):\s*Promise<ForgotPasswordResponse>/,
        "forgotPassword must continue returning Promise<ForgotPasswordResponse>",
      );
    });
  });

  // =========================================================================
  // GROUP 2: Type Guard Safe Envelope Detection
  // =========================================================================

  describe("2. Safe Envelope Type Guard (isApiResponse)", () => {
    test("2.1. Validates standard success envelope with object data", () => {
      const envelope = {
        success: true,
        statusCode: 200,
        message: "Request successful",
        data: { id: "123", role: "WORKER" },
      };
      assert.strictEqual(isApiResponse(envelope), true);
    });

    test("2.2. Validates standard success envelope with array data", () => {
      const envelope = {
        success: true,
        statusCode: 200,
        message: "Users fetched",
        data: [{ id: "1" }, { id: "2" }],
      };
      assert.strictEqual(isApiResponse(envelope), true);
    });

    test("2.3. Validates standard success envelope with null data", () => {
      const envelope = {
        success: true,
        statusCode: 200,
        message: "Logged out successfully",
        data: null,
      };
      assert.strictEqual(isApiResponse(envelope), true);
    });

    test("2.4. Validates standard success envelope with primitive / boolean data", () => {
      const envelope = {
        success: true,
        statusCode: 200,
        message: "Status updated",
        data: true,
      };
      assert.strictEqual(isApiResponse(envelope), true);
    });

    test("2.5. Safely rejects non-envelope payloads", () => {
      assert.strictEqual(isApiResponse(null), false);
      assert.strictEqual(isApiResponse(undefined), false);
      assert.strictEqual(isApiResponse("simple string"), false);
      assert.strictEqual(isApiResponse(123), false);
      assert.strictEqual(isApiResponse([]), false);
      assert.strictEqual(isApiResponse({}), false);

      // Missing success
      assert.strictEqual(
        isApiResponse({ statusCode: 200, message: "ok", data: {} }),
        false,
      );

      // success: false (Error response, not success response envelope)
      assert.strictEqual(
        isApiResponse({ success: false, statusCode: 400, message: "bad", data: null }),
        false,
      );

      // Missing statusCode
      assert.strictEqual(
        isApiResponse({ success: true, message: "ok", data: {} }),
        false,
      );

      // Non-number statusCode
      assert.strictEqual(
        isApiResponse({ success: true, statusCode: "200", message: "ok", data: {} }),
        false,
      );

      // Missing message
      assert.strictEqual(
        isApiResponse({ success: true, statusCode: 200, data: {} }),
        false,
      );

      // Missing data property
      assert.strictEqual(
        isApiResponse({ success: true, statusCode: 200, message: "ok" }),
        false,
      );

      // Legitimate business object that happens to have a 'data' field but no success/statusCode
      assert.strictEqual(
        isApiResponse({ id: "payload-1", data: "some raw string" }),
        false,
      );
    });
  });

  // =========================================================================
  // GROUP 3: Runtime Unwrapping via Axios Response Interceptor
  // =========================================================================

  describe("3. Centralized Success Unwrapping (Phase 11 Scenarios)", () => {
    test("3.1. Successful single-object response: unwraps { id: '123' } to consumer", async () => {
      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          data: {
            success: true,
            statusCode: 200,
            message: "Success",
            data: {
              id: "123",
            },
          },
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.get("/api/user/123");
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.data, { id: "123" });
      assert.strictEqual(response.data.success, undefined);
    });

    test("3.2. Successful array response: unwraps [{ id: '1' }, { id: '2' }] to consumer", async () => {
      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          data: {
            success: true,
            statusCode: 200,
            message: "Success",
            data: [
              { id: "1" },
              { id: "2" },
            ],
          },
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.get("/api/users");
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.data, [{ id: "1" }, { id: "2" }]);
    });

    test("3.3. Nested login response: unwraps AuthResponse so Login.tsx accesses response.data.user directly", async () => {
      const mockUser = {
        id: "worker-123",
        email: "worker@gigly.com",
        role: "WORKER",
        firstName: "Alex",
        lastName: "Smith",
      };

      const mockAdapter = async (config) => {
        return {
          status: 201,
          statusText: "Created",
          headers: { "content-type": "application/json" },
          config,
          data: {
            success: true,
            statusCode: 201,
            message: "Login successful",
            data: {
              user: mockUser,
            },
          },
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.post("/auth/login", {
        email: "worker@gigly.com",
        password: "password123",
      });

      assert.strictEqual(response.status, 201);
      // Consumer accesses response.data.user directly (NO response.data.data.user needed!)
      assert.ok(response.data.user, "response.data.user must be present");
      assert.strictEqual(response.data.user.id, "worker-123");
      assert.strictEqual(response.data.user.role, "WORKER");
      assert.strictEqual(response.data.user.firstName, "Alex");
    });

    test("3.4. Null data: unwraps to null for response.data", async () => {
      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          data: {
            success: true,
            statusCode: 200,
            message: "Logged out successfully",
            data: null,
          },
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.post("/auth/logout");
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data, null);
    });

    test("3.5. Binary/blob response: leaves binary data untouched", async () => {
      const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/png" });

      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "image/png" },
          config,
          data: fakeBlob,
        };
      };

      api.defaults.adapter = mockAdapter;

      // With responseType: 'blob'
      const response = await api.get("/worker/profile/avatar", {
        responseType: "blob",
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data, fakeBlob);
      assert.strictEqual(response.data instanceof Blob, true);
    });

    test("3.6. ArrayBuffer response: leaves arraybuffer data untouched", async () => {
      const buffer = new ArrayBuffer(8);

      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/octet-stream" },
          config,
          data: buffer,
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.get("/download/file", {
        responseType: "arraybuffer",
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data, buffer);
      assert.strictEqual(response.data instanceof ArrayBuffer, true);
    });

    test("3.7. Raw/non-envelope response: leaves raw response data untouched", async () => {
      const rawPayload = {
        customField: "legacy_value",
        items: [1, 2, 3],
      };

      const mockAdapter = async (config) => {
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          data: rawPayload,
        };
      };

      api.defaults.adapter = mockAdapter;

      const response = await api.get("/api/legacy-endpoint");
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.data, rawPayload);
    });
  });

  // =========================================================================
  // GROUP 4: Backend Error & Validation Contract Handling
  // =========================================================================

  describe("4. Error & Validation Handling (Phase 11 Scenarios)", () => {
    test("4.1. Backend error response: Axios error preserves error.response.data with ApiErrorResponse", async () => {
      const errorPayload = {
        success: false,
        statusCode: 403,
        message: "Forbidden",
        data: null,
      };

      const mockAdapter = async (config) => {
        throw createAxiosError(403, errorPayload, config);
      };

      api.defaults.adapter = mockAdapter;

      await assert.rejects(
        async () => {
          await api.get("/admin/users");
        },
        (err) => {
          assert.strictEqual(axios.isAxiosError(err), true);
          assert.strictEqual(err.response?.status, 403);
          assert.deepStrictEqual(err.response?.data, errorPayload);
          assert.strictEqual(err.response?.data?.message, "Forbidden");
          assert.strictEqual(err.response?.data?.success, false);
          return true;
        },
      );
    });

    test("4.2. Validation error response: Axios error preserves error.response.data.errors array", async () => {
      const validationPayload = {
        success: false,
        statusCode: 400,
        message: "Validation failed",
        errors: [
          "email must be an email",
          "password should not be empty",
        ],
        data: null,
      };

      const mockAdapter = async (config) => {
        throw createAxiosError(400, validationPayload, config);
      };

      api.defaults.adapter = mockAdapter;

      await assert.rejects(
        async () => {
          await api.post("/auth/login", { email: "invalid", password: "" });
        },
        (err) => {
          assert.strictEqual(axios.isAxiosError(err), true);
          assert.strictEqual(err.response?.status, 400);
          assert.strictEqual(err.response?.data?.message, "Validation failed");
          assert.deepStrictEqual(err.response?.data?.errors, [
            "email must be an email",
            "password should not be empty",
          ]);
          return true;
        },
      );
    });
  });

  // =========================================================================
  // GROUP 5: 401 Refresh & Retry Integration
  // =========================================================================

  describe("5. 401 Token Refresh & Envelope Retry Integration", () => {
    test("5.1. 401 response triggers refresh and retried request is successfully unwrapped", async () => {
      let refreshCount = 0;
      let tokenRotated = false;

      const mockAdapter = async (config) => {
        // Refresh call
        if (config.url.endsWith("/auth/refresh")) {
          refreshCount++;
          tokenRotated = true;
          return {
            status: 200,
            statusText: "OK",
            headers: {},
            config,
            data: {
              success: true,
              statusCode: 200,
              message: "Token refreshed successfully",
              data: { refreshed: true },
            },
          };
        }

        // Protected resource
        if (!tokenRotated) {
          throw createAxiosError(
            401,
            { success: false, statusCode: 401, message: "Unauthorized", data: null },
            config,
          );
        }

        // Retried call returns standard success envelope
        return {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          data: {
            success: true,
            statusCode: 200,
            message: "Profile retrieved successfully",
            data: {
              id: "worker-99",
              firstName: "Robin",
              lastName: "Banks",
            },
          },
        };
      };

      api.defaults.adapter = mockAdapter;
      axios.defaults.adapter = mockAdapter;

      const response = await api.get("/worker/profile");

      assert.strictEqual(refreshCount, 1, "Exactly one refresh was triggered");
      assert.strictEqual(response.status, 200);
      // Verify retried request unwrapped the envelope cleanly
      assert.deepStrictEqual(response.data, {
        id: "worker-99",
        firstName: "Robin",
        lastName: "Banks",
      });
    });

    test("5.2. Refresh failure cleanly propagates without deadlocks", async () => {
      const mockAdapter = async (config) => {
        if (config.url.endsWith("/auth/refresh")) {
          throw createAxiosError(
            401,
            { success: false, statusCode: 401, message: "Refresh token expired", data: null },
            config,
          );
        }
        throw createAxiosError(
          401,
          { success: false, statusCode: 401, message: "Unauthorized", data: null },
          config,
        );
      };

      api.defaults.adapter = mockAdapter;
      axios.defaults.adapter = mockAdapter;

      await assert.rejects(
        async () => {
          await api.get("/worker/profile");
        },
        /Refresh token expired|Unauthorized/,
      );
    });
  });
});
