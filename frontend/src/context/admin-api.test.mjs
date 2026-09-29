import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Step 2: Admin User Types and Admin API Service", () => {
  const typesPath = path.resolve(__dirname, "../types/admin.ts");
  const apiPath = path.resolve(__dirname, "../lib/admin-api.ts");
  const baseApiPath = path.resolve(__dirname, "../lib/api.ts");

  describe("1. Admin Types Definition & Contract Boundaries", () => {
    test("1.1. types/admin.ts defines AdminUser and SetAdminUserBlockStatusPayload", () => {
      assert.strictEqual(fs.existsSync(typesPath), true);
      const content = fs.readFileSync(typesPath, "utf-8");

      assert.match(
        content,
        /export interface AdminUser\s*\{[\s\S]*?id:\s*string;[\s\S]*?email:\s*string;[\s\S]*?role:\s*UserRole;[\s\S]*?firstName:\s*string;[\s\S]*?lastName:\s*string;[\s\S]*?isActive:\s*boolean;[\s\S]*?isBlocked:\s*boolean;[\s\S]*?createdAt:\s*string;[\s\S]*?\}/,
        "AdminUser interface must define id, email, role, firstName, lastName, isActive, isBlocked, and createdAt",
      );

      assert.match(
        content,
        /export interface SetAdminUserBlockStatusPayload\s*\{[\s\S]*?isBlocked:\s*boolean;[\s\S]*?\}/,
        "SetAdminUserBlockStatusPayload interface must define isBlocked: boolean",
      );
    });

    test("1.2. types/admin.ts reuses UserRole from ./auth", () => {
      const content = fs.readFileSync(typesPath, "utf-8");
      assert.match(
        content,
        /import\s+type\s*\{\s*UserRole\s*\}\s*from\s+["']\.\/auth["']/,
        "types/admin.ts must reuse existing UserRole type from auth.ts",
      );
    });

    test("1.3. types/admin.ts does NOT expose unsupported future Figma fields", () => {
      const content = fs.readFileSync(typesPath, "utf-8");
      const unsupportedFields = [
        "rating",
        "completedGigs",
        "reportsCount",
        "riskScore",
        "highRisk",
        "reportSummary",
        "reportedWorkers",
      ];

      for (const field of unsupportedFields) {
        assert.strictEqual(
          content.includes(field),
          false,
          `types/admin.ts must NOT expose unsupported future field: ${field}`,
        );
      }
    });

    test("1.4. types/admin.ts preserves bio as optional string or null, not as job title", () => {
      const content = fs.readFileSync(typesPath, "utf-8");
      assert.match(
        content,
        /bio\?:\s*string\s*\|\s*null;/,
        "bio must be typed as string | null without reinterpretation as structured job title",
      );
    });
  });

  describe("2. Admin API Helpers Export & Implementation", () => {
    test("2.1. admin-api.ts exports getAdminUsers, getAdminUser, and setAdminUserBlockStatus", () => {
      assert.strictEqual(fs.existsSync(apiPath), true);
      const content = fs.readFileSync(apiPath, "utf-8");

      assert.match(content, /export const getAdminUsers\s*=/);
      assert.match(content, /export const getAdminUser\s*=/);
      assert.match(content, /export const setAdminUserBlockStatus\s*=/);
    });

    test("2.2. admin-api.ts reuses existing api instance and does not create new axios instances", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /import\s+api\s+from\s+["']\.\/api["']/,
        "admin-api.ts must import existing api instance",
      );
      assert.strictEqual(
        content.includes("axios.create"),
        false,
        "admin-api.ts must NOT create a new axios instance",
      );
    });

    test("2.3. admin-api.ts does NOT access localStorage, sessionStorage, or attach manual Bearer tokens", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.strictEqual(content.includes("localStorage"), false);
      assert.strictEqual(content.includes("sessionStorage"), false);
      assert.strictEqual(content.includes("Bearer "), false);
    });

    test("2.4. base api.ts configures withCredentials: true for HttpOnly cookies", () => {
      const content = fs.readFileSync(baseApiPath, "utf-8");
      assert.match(content, /withCredentials:\s*true/);
    });
  });

  describe("3. API Function Contracts & Endpoint Routing", () => {
    test("3.1. getAdminUsers dispatches GET /admin/users", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.get<AdminUser\[\]>\(\s*["']\/admin\/users["']\s*\)/,
        "getAdminUsers must dispatch GET /admin/users",
      );
    });

    test("3.2. getAdminUser dispatches GET /admin/users/:userId", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.get<AdminUser>\(\s*`\/admin\/users\/\$\{userId\}`\s*\)/,
        "getAdminUser must dispatch GET /admin/users/:userId",
      );
    });

    test("3.3. setAdminUserBlockStatus dispatches PATCH /admin/users/:userId/block with payload", () => {
      const content = fs.readFileSync(apiPath, "utf-8");
      assert.match(
        content,
        /api\.patch<AdminUser>\(\s*`\/admin\/users\/\$\{userId\}\/block`,\s*payload,?\s*\)/,
        "setAdminUserBlockStatus must dispatch PATCH /admin/users/:userId/block",
      );
    });
  });
});
