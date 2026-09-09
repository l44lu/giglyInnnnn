import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Step 5: Frontend Forgot Password Integration & Security Invariants", () => {
  let localStorageMock;
  let sessionStorageMock;
  let apiMock;
  let dispatchedRequests;

  beforeEach(() => {
    const localStore = new Map();
    localStorageMock = {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, val) => localStore.set(key, String(val)),
      removeItem: (key) => localStore.delete(key),
      clear: () => localStore.clear(),
    };

    const sessionStore = new Map();
    sessionStorageMock = {
      getItem: (key) => sessionStore.get(key) ?? null,
      setItem: (key, val) => sessionStore.set(key, String(val)),
      removeItem: (key) => sessionStore.delete(key),
      clear: () => sessionStore.clear(),
    };

    dispatchedRequests = [];

    apiMock = {
      post: async (url, data) => {
        dispatchedRequests.push({ url, data });
        if (url === "/auth/forgot-password") {
          return {
            data: {
              message:
                "If an account with that email exists, a password reset code has been sent.",
            },
          };
        }
        if (url === "/auth/verify-reset-otp") {
          if (data.otp === "123456") {
            return {
              data: {
                resetToken: "mock-64-hex-reset-authorization-token",
                message:
                  "Verification successful. You may now reset your password.",
              },
            };
          }
          const err = new Error("Invalid verification code");
          err.response = {
            status: 400,
            data: { message: "Invalid verification code" },
          };
          throw err;
        }
        if (url === "/auth/reset-password") {
          if (data.newPassword === data.confirmPassword) {
            return {
              data: {
                message: "Password has been reset successfully.",
              },
            };
          }
          const err = new Error("Passwords do not match");
          err.response = {
            status: 400,
            data: { message: "Passwords do not match" },
          };
          throw err;
        }
        throw new Error(`Unhandled route: ${url}`);
      },
    };
  });

  // =========================================================================
  // GROUP 1: Routing & Navigation Contracts
  // =========================================================================
  describe("1. Routing and Public Route Contracts", () => {
    test("1.1. App.tsx registers /forgot-password as an unauthenticated public route", () => {
      const appPath = path.resolve(__dirname, "../App.tsx");
      const appContent = fs.readFileSync(appPath, "utf-8");

      assert.ok(
        appContent.includes('path="/forgot-password"'),
        "App.tsx must define path='/forgot-password'",
      );
      assert.ok(
        appContent.includes("<ForgotPassword />"),
        "App.tsx must render <ForgotPassword />",
      );

      // Verify it is NOT wrapped inside ProtectedRoute
      const publicRouteSection = appContent.split(
        "{/* Public Routes */}",
      )[1]?.split("{/* Protected Dashboard Routes */}")[0];

      assert.ok(
        publicRouteSection &&
          publicRouteSection.includes('path="/forgot-password"'),
        "/forgot-password must be placed in the public routes section outside ProtectedRoute",
      );
    });

    test("1.2. Login.tsx links 'Forgot password?' directly to /forgot-password", () => {
      const loginPath = path.resolve(__dirname, "../pages/Login.tsx");
      const loginContent = fs.readFileSync(loginPath, "utf-8");

      assert.ok(
        loginContent.includes('to="/forgot-password"'),
        "Login.tsx must contain <Link to='/forgot-password'>",
      );
      assert.ok(
        !loginContent.includes('href="#"\n                  className="text-sm font-medium text-blue-600 hover:text-blue-500"\n                >\n                  Forgot password?'),
        "Login.tsx must not contain dead placeholder href='#' for forgot password",
      );
    });
  });

  // =========================================================================
  // GROUP 2: Axios Interceptor & Exclusion Boundary
  // =========================================================================
  describe("2. Axios 401 Interceptor Exclusion Boundary", () => {
    test("2.1. api.ts excludes forgot-password routes from recursive refresh interceptor", () => {
      const apiPath = path.resolve(__dirname, "../lib/api.ts");
      const apiContent = fs.readFileSync(apiPath, "utf-8");

      assert.ok(
        apiContent.includes('requestUrl.includes("/auth/forgot-password")'),
        "api.ts must exclude /auth/forgot-password from 401 refresh interception",
      );
      assert.ok(
        apiContent.includes('requestUrl.includes("/auth/verify-reset-otp")'),
        "api.ts must exclude /auth/verify-reset-otp from 401 refresh interception",
      );
      assert.ok(
        apiContent.includes('requestUrl.includes("/auth/reset-password")'),
        "api.ts must exclude /auth/reset-password from 401 refresh interception",
      );
    });
  });

  // =========================================================================
  // GROUP 3: Multi-Step Flow Simulation & Logic Validation
  // =========================================================================
  describe("3. Multi-Step Flow Engine & Validation", () => {
    // Engine simulating ForgotPassword state transitions
    const createResetEngine = () => {
      let step = "EMAIL";
      let email = "";
      let resetToken = null;
      let error = null;

      const submitEmail = async (inputEmail) => {
        error = null;
        const normalized = inputEmail.trim().toLowerCase();
        if (!normalized || !/\S+@\S+\.\S+/.test(normalized)) {
          error = "Please enter a valid email address.";
          return false;
        }

        email = normalized;
        const res = await apiMock.post("/auth/forgot-password", {
          email: normalized,
        });
        step = "OTP";
        return true;
      };

      const submitOtp = async (otp) => {
        error = null;
        if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
          error = "Please enter the complete 6-digit code.";
          return false;
        }

        try {
          const res = await apiMock.post("/auth/verify-reset-otp", {
            email,
            otp,
          });
          // IN-MEMORY ONLY
          resetToken = res.data.resetToken;
          step = "PASSWORD";
          return true;
        } catch (err) {
          error = err.response?.data?.message || "Verification failed";
          return false;
        }
      };

      const submitPassword = async (newPassword, confirmPassword) => {
        error = null;
        if (!resetToken) {
          error = "Reset session expired.";
          step = "EMAIL";
          return false;
        }
        if (!newPassword || newPassword.length < 8) {
          error = "Password must be at least 8 characters long.";
          return false;
        }
        if (newPassword !== confirmPassword) {
          error = "Passwords do not match.";
          return false;
        }

        try {
          await apiMock.post("/auth/reset-password", {
            resetToken,
            newPassword,
            confirmPassword,
          });
          resetToken = null;
          step = "SUCCESS";
          return true;
        } catch (err) {
          error = err.response?.data?.message || "Reset failed";
          return false;
        }
      };

      return {
        getStep: () => step,
        getEmail: () => email,
        getResetToken: () => resetToken,
        getError: () => error,
        submitEmail,
        submitOtp,
        submitPassword,
      };
    };

    test("3.1. Full Happy Path: Email -> OTP -> New Password -> Success", async () => {
      const engine = createResetEngine();
      assert.strictEqual(engine.getStep(), "EMAIL");

      // Step 1: Submit Email
      const emailOk = await engine.submitEmail("User@Gigly.IN");
      assert.strictEqual(emailOk, true);
      assert.strictEqual(engine.getStep(), "OTP");
      assert.strictEqual(engine.getEmail(), "user@gigly.in");
      assert.strictEqual(dispatchedRequests[0].url, "/auth/forgot-password");
      assert.strictEqual(
        dispatchedRequests[0].data.email,
        "user@gigly.in",
      );

      // Step 2: Submit Valid OTP
      const otpOk = await engine.submitOtp("123456");
      assert.strictEqual(otpOk, true);
      assert.strictEqual(engine.getStep(), "PASSWORD");
      assert.strictEqual(
        engine.getResetToken(),
        "mock-64-hex-reset-authorization-token",
      );
      assert.strictEqual(dispatchedRequests[1].url, "/auth/verify-reset-otp");

      // Step 3: Submit New Password
      const passOk = await engine.submitPassword(
        "NewSecurePass123!",
        "NewSecurePass123!",
      );
      assert.strictEqual(passOk, true);
      assert.strictEqual(engine.getStep(), "SUCCESS");
      assert.strictEqual(
        engine.getResetToken(),
        null,
        "resetToken must be wiped after success",
      );
      assert.strictEqual(dispatchedRequests[2].url, "/auth/reset-password");
    });

    test("3.2. Invalid Email validation rejects submission without API dispatch", async () => {
      const engine = createResetEngine();
      const ok = await engine.submitEmail("invalid-email-address");

      assert.strictEqual(ok, false);
      assert.strictEqual(engine.getStep(), "EMAIL");
      assert.strictEqual(engine.getError(), "Please enter a valid email address.");
      assert.strictEqual(dispatchedRequests.length, 0);
    });

    test("3.3. Invalid OTP format (< 6 digits) rejects submission without API dispatch", async () => {
      const engine = createResetEngine();
      await engine.submitEmail("user@example.com");

      const ok = await engine.submitOtp("123");
      assert.strictEqual(ok, false);
      assert.strictEqual(engine.getStep(), "OTP");
      assert.strictEqual(
        engine.getError(),
        "Please enter the complete 6-digit code.",
      );
      // Only the initial email request was made
      assert.strictEqual(dispatchedRequests.length, 1);
    });

    test("3.4. Incorrect OTP from backend displays error and keeps user on OTP step", async () => {
      const engine = createResetEngine();
      await engine.submitEmail("user@example.com");

      const ok = await engine.submitOtp("000000"); // Wrong OTP
      assert.strictEqual(ok, false);
      assert.strictEqual(engine.getStep(), "OTP");
      assert.strictEqual(engine.getError(), "Invalid verification code");
      assert.strictEqual(engine.getResetToken(), null);
    });

    test("3.5. Password mismatch rejects submission before API dispatch", async () => {
      const engine = createResetEngine();
      await engine.submitEmail("user@example.com");
      await engine.submitOtp("123456");

      const initialRequestsCount = dispatchedRequests.length;
      const ok = await engine.submitPassword("Password123!", "MismatchingPass!");

      assert.strictEqual(ok, false);
      assert.strictEqual(engine.getStep(), "PASSWORD");
      assert.strictEqual(engine.getError(), "Passwords do not match.");
      assert.strictEqual(dispatchedRequests.length, initialRequestsCount);
    });

    test("3.6. Password shorter than 8 characters rejects submission", async () => {
      const engine = createResetEngine();
      await engine.submitEmail("user@example.com");
      await engine.submitOtp("123456");

      const ok = await engine.submitPassword("Short1!", "Short1!");

      assert.strictEqual(ok, false);
      assert.strictEqual(engine.getStep(), "PASSWORD");
      assert.strictEqual(
        engine.getError(),
        "Password must be at least 8 characters long.",
      );
    });
  });

  // =========================================================================
  // GROUP 4: Security Invariants & Storage Non-Pollution
  // =========================================================================
  describe("4. Security Invariants (CWE-532, Storage Non-Pollution)", () => {
    test("4.1. ForgotPassword.tsx NEVER writes resetToken or OTP to localStorage or sessionStorage", () => {
      const pagePath = path.resolve(__dirname, "../pages/ForgotPassword.tsx");
      const pageContent = fs.readFileSync(pagePath, "utf-8");

      assert.ok(
        !pageContent.includes("localStorage.setItem"),
        "ForgotPassword.tsx must never write to localStorage",
      );
      assert.ok(
        !pageContent.includes("sessionStorage.setItem"),
        "ForgotPassword.tsx must never write to sessionStorage",
      );
    });

    test("4.2. ForgotPassword.tsx does not log raw OTP or resetToken to console", () => {
      const pagePath = path.resolve(__dirname, "../pages/ForgotPassword.tsx");
      const pageContent = fs.readFileSync(pagePath, "utf-8");

      assert.ok(
        !pageContent.includes("console.log(otp"),
        "ForgotPassword.tsx must not log OTP",
      );
      assert.ok(
        !pageContent.includes("console.log(resetToken"),
        "ForgotPassword.tsx must not log resetToken",
      );
      assert.ok(
        !pageContent.includes("console.log(response.resetToken"),
        "ForgotPassword.tsx must not log resetToken from response",
      );
    });

    test("4.3. AuthContext is NOT polluted by password reset flow", () => {
      const authContextPath = path.resolve(
        __dirname,
        "../context/AuthContext.tsx",
      );
      const authContextContent = fs.readFileSync(authContextPath, "utf-8");

      assert.ok(
        !authContextContent.includes("resetToken"),
        "AuthContext must remain clean and have zero resetToken references",
      );
      assert.ok(
        !authContextContent.includes("forgotPassword"),
        "AuthContext must remain clean and have zero forgotPassword references",
      );
    });
  });
});
