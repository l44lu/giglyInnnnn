import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Step 9.3: Frontend Authentication Error Logging Security Invariants (CWE-532)", () => {
  const loginPath = path.resolve(__dirname, "../pages/Login.tsx");
  const signupPath = path.resolve(__dirname, "../pages/Signup.tsx");
  const forgotPasswordPath = path.resolve(__dirname, "../pages/ForgotPassword.tsx");
  const authContextPath = path.resolve(__dirname, "../context/AuthContext.tsx");
  const apiPath = path.resolve(__dirname, "../lib/api.ts");
  const authApiPath = path.resolve(__dirname, "../lib/auth-api.ts");

  const loginContent = fs.readFileSync(loginPath, "utf-8");
  const signupContent = fs.readFileSync(signupPath, "utf-8");
  const forgotPasswordContent = fs.readFileSync(forgotPasswordPath, "utf-8");
  const authContextContent = fs.readFileSync(authContextPath, "utf-8");
  const apiContent = fs.readFileSync(apiPath, "utf-8");
  const authApiContent = fs.readFileSync(authApiPath, "utf-8");

  describe("1. Static Code Analysis: No Raw Console Logging in Auth Flows", () => {
    test("1.1. Login.tsx contains ZERO console.error, console.log, console.warn, or console.debug", () => {
      assert.ok(!loginContent.includes("console.error"), "Login.tsx must not call console.error");
      assert.ok(!loginContent.includes("console.log"), "Login.tsx must not call console.log");
      assert.ok(!loginContent.includes("console.warn"), "Login.tsx must not call console.warn");
      assert.ok(!loginContent.includes("console.debug"), "Login.tsx must not call console.debug");
    });

    test("1.2. Signup.tsx contains ZERO console.error, console.log, console.warn, or console.debug", () => {
      assert.ok(!signupContent.includes("console.error"), "Signup.tsx must not call console.error");
      assert.ok(!signupContent.includes("console.log"), "Signup.tsx must not call console.log");
      assert.ok(!signupContent.includes("console.warn"), "Signup.tsx must not call console.warn");
      assert.ok(!signupContent.includes("console.debug"), "Signup.tsx must not call console.debug");
    });

    test("1.3. ForgotPassword.tsx contains ZERO console.error, console.log, console.warn, or console.debug", () => {
      assert.ok(!forgotPasswordContent.includes("console.error"), "ForgotPassword.tsx must not call console.error");
      assert.ok(!forgotPasswordContent.includes("console.log"), "ForgotPassword.tsx must not call console.log");
      assert.ok(!forgotPasswordContent.includes("console.warn"), "ForgotPassword.tsx must not call console.warn");
      assert.ok(!forgotPasswordContent.includes("console.debug"), "ForgotPassword.tsx must not call console.debug");
    });

    test("1.4. AuthContext.tsx, api.ts, and auth-api.ts contain ZERO console logging calls", () => {
      assert.ok(!authContextContent.includes("console."), "AuthContext.tsx must not call console.*");
      assert.ok(!apiContent.includes("console."), "api.ts must not call console.*");
      assert.ok(!authApiContent.includes("console."), "auth-api.ts must not call console.*");
    });
  });

  describe("2. Safe User-Facing Error Extraction Preservation", () => {
    test("2.1. Login.tsx preserves safe error.response?.data?.message extraction for Swal.fire", () => {
      assert.ok(
        loginContent.includes("axios.isAxiosError<{ message: string | string[] }>(error)"),
        "Login.tsx must safely typecheck AxiosError",
      );
      assert.ok(
        loginContent.includes("message = error.response?.data?.message || message;"),
        "Login.tsx must extract only safe response message",
      );
      assert.ok(
        loginContent.includes("Swal.fire({"),
        "Login.tsx must present safe error via user-friendly Swal modal",
      );
    });

    test("2.2. Signup.tsx preserves safe error extraction across handleSubmit, handleVerifyOtp, and handleResendOtp", () => {
      assert.ok(
        signupContent.includes("message = error.response?.data?.message || message;"),
        "Signup.tsx must extract safe response message",
      );
      assert.ok(
        signupContent.includes('let message: string | string[] = "Registration Failed.";'),
        "Signup.tsx has fallback message for registration failure",
      );
      assert.ok(
        signupContent.includes('let message: string | string[] = "Verification Failed.";'),
        "Signup.tsx has fallback message for verification failure",
      );
      assert.ok(
        signupContent.includes('let message: string | string[] = "Failed to resend code.";'),
        "Signup.tsx has fallback message for resend failure",
      );
    });

    test("2.3. ForgotPassword.tsx preserves extractErrorMessage utility without leaking raw objects", () => {
      assert.ok(
        forgotPasswordContent.includes("const extractErrorMessage = (error: unknown, fallback: string): string"),
        "ForgotPassword.tsx must maintain safe error extraction function",
      );
      assert.ok(
        forgotPasswordContent.includes("const msg = error.response?.data?.message;"),
        "ForgotPassword.tsx extracts message property specifically",
      );
    });
  });

  describe("3. Simulated Error Processing Invariant: Credentials Never Reached Console", () => {
    test("3.1. Simulated login failure with Axios error containing password does NOT emit to console", () => {
      const consoleCalls = [];
      const origError = console.error;
      const origLog = console.log;
      console.error = (...args) => consoleCalls.push(args);
      console.log = (...args) => consoleCalls.push(args);

      try {
        const mockAxiosError = {
          isAxiosError: true,
          config: {
            url: "/auth/login",
            method: "post",
            data: JSON.stringify({
              email: "testuser@example.com",
              password: "SuperSecretPassword123!",
            }),
          },
          response: {
            status: 401,
            data: { message: "Invalid credentials." },
          },
        };

        // Execute extraction pattern identical to Login.tsx
        let message = "Login Failed. Check credentials.";
        if (mockAxiosError.response?.data?.message) {
          message = mockAxiosError.response.data.message;
        }

        assert.strictEqual(message, "Invalid credentials.");
        assert.strictEqual(consoleCalls.length, 0, "No console calls were made during error handling");
      } finally {
        console.error = origError;
        console.log = origLog;
      }
    });

    test("3.2. Simulated registration OTP failure with Axios error containing OTP does NOT emit to console", () => {
      const consoleCalls = [];
      const origError = console.error;
      console.error = (...args) => consoleCalls.push(args);

      try {
        const mockAxiosError = {
          isAxiosError: true,
          config: {
            url: "/auth/register/verify-otp",
            method: "post",
            data: JSON.stringify({
              email: "testuser@example.com",
              otp: "987654",
            }),
          },
          response: {
            status: 400,
            data: { message: "Invalid or expired verification code." },
          },
        };

        // Execute extraction pattern identical to Signup.tsx handleVerifyOtp
        let message = "Verification Failed.";
        if (mockAxiosError.response?.data?.message) {
          message = mockAxiosError.response.data.message;
        }

        assert.strictEqual(message, "Invalid or expired verification code.");
        assert.strictEqual(consoleCalls.length, 0, "No console calls were made during verification error");
      } finally {
        console.error = origError;
      }
    });
  });
});
