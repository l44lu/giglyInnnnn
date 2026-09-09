import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  Mail,
  KeyRound,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { forgotPassword, verifyResetOtp, resetPassword } from "@/lib/auth-api";

const OTP_LENGTH = 6;
type ResetStep = "EMAIL" | "OTP" | "PASSWORD" | "SUCCESS";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState<ResetStep>("EMAIL");
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );

  // In-Memory Security Boundary: reset authorization token is NEVER persisted in localStorage/sessionStorage/cookies
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Extract friendly error message from Axios or Error
  const extractErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
      const msg = error.response?.data?.message;
      if (Array.isArray(msg)) return msg.join(", ");
      if (typeof msg === "string") return msg;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  // ─── STEP 1: Request Reset Code (Email) ──────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(trimmedEmail);

      // Transition to OTP step
      setCurrentStep("OTP");
      setOtpValues(Array(OTP_LENGTH).fill(""));
      setResendCooldown(60);

      await Swal.fire({
        icon: "info",
        title: "Check Your Inbox",
        text: `If an account with ${trimmedEmail} exists, a 6-digit code has been sent.`,
        confirmButtonColor: "#2563eb",
        timer: 3500,
        timerProgressBar: true,
      });

      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to request password reset. Please try again.",
      );
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── STEP 2: Verify OTP ──────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    setErrorMessage(null);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValues.every((v) => v !== "")) {
      void handleVerifyOtpSubmit(newValues);
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newValues = [...otpValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);
    setErrorMessage(null);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (newValues.every((v) => v !== "")) {
      void handleVerifyOtpSubmit(newValues);
    }
  };

  const handleVerifyOtpSubmit = useCallback(
    async (valuesOverride?: string[]) => {
      setErrorMessage(null);
      const values = valuesOverride || otpValues;
      const otpString = values.join("");

      if (otpString.length !== OTP_LENGTH) {
        setErrorMessage("Please enter the complete 6-digit code.");
        return;
      }

      setIsLoading(true);
      try {
        const response = await verifyResetOtp(email, otpString);

        // Security Invariant: Keep resetToken in React memory ONLY
        setResetToken(response.resetToken);
        setCurrentStep("PASSWORD");

        await Swal.fire({
          icon: "success",
          title: "Code Verified!",
          text: "Verification successful. You may now create a new password.",
          confirmButtonColor: "#2563eb",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: unknown) {
        const msg = extractErrorMessage(
          err,
          "Invalid or expired verification code. Please try again.",
        );
        setErrorMessage(msg);
        setOtpValues(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [email, otpValues],
  );

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await forgotPassword(email);
      setResendCooldown(60);
      setOtpValues(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();

      await Swal.fire({
        icon: "success",
        title: "Code Resent",
        text: "A fresh verification code has been dispatched to your email.",
        confirmButtonColor: "#2563eb",
        timer: 2500,
        timerProgressBar: true,
      });
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to resend code. Please try again.",
      );
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── STEP 3: Reset Password ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage("Reset session expired. Please start over.");
      setCurrentStep("EMAIL");
      return;
    }

    if (!newPassword) {
      setErrorMessage("New password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword, confirmPassword);

      // Wipe sensitive in-memory credentials immediately
      setResetToken(null);
      setNewPassword("");
      setConfirmPassword("");
      setOtpValues(Array(OTP_LENGTH).fill(""));

      setCurrentStep("SUCCESS");
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to reset password. Please try again.",
      );
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step Back Handler ───────────────────────────────────────────────────
  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep === "OTP") {
      // Return to email and invalidate current OTP input
      setOtpValues(Array(OTP_LENGTH).fill(""));
      setCurrentStep("EMAIL");
    } else if (currentStep === "PASSWORD") {
      // Return to OTP, preserve resetToken in memory if user wishes to adjust
      setCurrentStep("OTP");
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      {/* Left Pane - Hero Banner (Matches Login & Signup) */}
      <div
        className="hidden lg:flex w-1/2 text-white flex-col justify-between p-12 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/signup-hero.png')" }}
      >
        <div className="absolute inset-0 bg-slate-900/60 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight">Gigly</span>
          </div>

          <div className="mt-auto pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Account Security.
              <br />
              Restored in Minutes.
            </h1>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Regain access to your gigs, applications, and profile with our
              secure multi-step verification process.
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane - Multi-Step Password Reset Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-16 relative bg-[#f8fafc] justify-between">
        {/* Top Header & Navigation */}
        <div className="flex justify-between items-center w-full mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link to="/signup">
              <button className="px-5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
                Sign up
              </button>
            </Link>
            <Link to="/login">
              <button className="px-5 py-1.5 bg-white rounded-md text-xs font-medium shadow-sm text-slate-900">
                Log in
              </button>
            </Link>
          </div>
        </div>

        {/* Center Container */}
        <div className="w-full max-w-md mx-auto space-y-6 my-auto">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-4 justify-center">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Gigly
            </span>
          </div>

          {/* Progress Indicator (Steps 1, 2, 3) */}
          {currentStep !== "SUCCESS" && (
            <div className="flex items-center justify-between px-2 mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep === "EMAIL"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  1
                </span>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                  Email
                </span>
              </div>
              <div className="w-8 sm:w-12 h-0.5 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep === "OTP"
                      ? "bg-blue-600 text-white"
                      : currentStep === "PASSWORD"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  2
                </span>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                  Code
                </span>
              </div>
              <div className="w-8 sm:w-12 h-0.5 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep === "PASSWORD"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  3
                </span>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                  Password
                </span>
              </div>
            </div>
          )}

          {/* Inline Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* ─── STEP 1: Enter Email ─── */}
          {currentStep === "EMAIL" && (
            <div className="space-y-6">
              <div className="text-center lg:text-left space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 mx-auto lg:mx-0">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Forgot password?
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  No worries. Enter the email address associated with your
                  account and we&apos;ll send a 6-digit verification code.
                </p>
              </div>

              <form
                onSubmit={(e) => void handleEmailSubmit(e)}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="reset-email"
                    className="text-slate-700 text-sm font-semibold"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    required
                    autoFocus
                    className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isLoading ? "Sending code..." : "Send Verification Code"}
                </Button>
              </form>
            </div>
          )}

          {/* ─── STEP 2: Verify 6-Digit OTP ─── */}
          {currentStep === "OTP" && (
            <div className="space-y-6">
              <div className="text-center lg:text-left space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 mx-auto lg:mx-0">
                  <KeyRound className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Check your email
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  We&apos;ve sent a 6-digit code to{" "}
                  <span className="font-semibold text-slate-800">{email}</span>.
                  Enter it below to continue.
                </p>
              </div>

              {/* 6 Digit OTP Inputs */}
              <div
                className="flex justify-center gap-2 sm:gap-3 py-2"
                onPaste={handleOtpPaste}
              >
                {otpValues.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-11 sm:w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                      ${
                        digit
                          ? "border-blue-500 bg-blue-50/40 text-blue-700"
                          : "border-slate-200 bg-white text-slate-900"
                      }
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => void handleVerifyOtpSubmit()}
                  disabled={isLoading || otpValues.some((v) => v === "")}
                  className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isLoading ? "Verifying code..." : "Verify Code"}
                </Button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-slate-600 hover:text-slate-900 font-medium underline"
                  >
                    Change email
                  </button>

                  <div>
                    {resendCooldown > 0 ? (
                      <span className="text-slate-400">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleResendOtp()}
                        disabled={isLoading}
                        className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Set New Password ─── */}
          {currentStep === "PASSWORD" && (
            <div className="space-y-6">
              <div className="text-center lg:text-left space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 mx-auto lg:mx-0">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Set new password
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Your new password must be at least 8 characters long and
                  different from your previous password.
                </p>
              </div>

              <form
                onSubmit={(e) => void handlePasswordSubmit(e)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-password"
                    className="text-slate-700 text-sm font-semibold"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      autoFocus
                      className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-slate-700 text-sm font-semibold"
                  >
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword.length < 8
                  }
                  className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-2"
                >
                  {isLoading ? "Updating password..." : "Reset Password"}
                </Button>
              </form>
            </div>
          )}

          {/* ─── STEP 4: Success Confirmation ─── */}
          {currentStep === "SUCCESS" && (
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Password reset complete!
                </h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Your password has been successfully updated. All previous
                  active sessions have been revoked for your security.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => void navigate("/login")}
                className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Log In to Your Account
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 mt-8">
          Protected by Gigly Enterprise Security & Anti-Enumeration Guard.
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
