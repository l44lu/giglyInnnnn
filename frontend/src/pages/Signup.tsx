import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, UserCircle, Mail } from "lucide-react";

const OTP_LENGTH = 6;

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "WORKER",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // OTP verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    // form validation rechecking required do check
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const sanitizedData = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/register/send-otp`,
        sanitizedData,
      );

      // OTP sent successfully — show the verification modal
      setShowOtpModal(true);
      setOtpValues(Array(OTP_LENGTH).fill(""));
      setResendCooldown(60);

      await Swal.fire({
        icon: "success",
        title: "Verification Code Sent!",
        text: `We've sent a 6-digit code to ${sanitizedData.email}`,
        confirmButtonColor: "#2563eb",
        timer: 3000,
        timerProgressBar: true,
      });

      // Focus the first OTP input after the alert closes
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error: unknown) {
      console.error(error);

      let message: string | string[] = "Registration Failed.";

      if (axios.isAxiosError<{ message: string | string[] }>(error)) {
        message = error.response?.data?.message || message;
      }

      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: Array.isArray(message) ? message.join(", ") : message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Auto-advance to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newOtpValues.every((v) => v !== "")) {
      void handleVerifyOtp(newOtpValues);
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

    const newOtpValues = [...otpValues];
    for (let i = 0; i < pasted.length; i++) {
      newOtpValues[i] = pasted[i];
    }
    setOtpValues(newOtpValues);

    // Focus the input after the last pasted digit
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (newOtpValues.every((v) => v !== "")) {
      void handleVerifyOtp(newOtpValues);
    }
  };

  const handleVerifyOtp = useCallback(
    async (customOtpValues?: string[]) => {
      const valuesToUse = customOtpValues || otpValues;
      const otpCode = valuesToUse.join("");
      if (otpCode.length !== OTP_LENGTH) {
        await Swal.fire({
          icon: "warning",
          title: "Incomplete Code",
          text: "Please enter the full 6-digit verification code.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      setIsVerifying(true);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/register/verify-otp`,
          {
            email: formData.email.trim().toLowerCase(),
            otp: otpCode,
          },
        );

        const data = response.data as { id: string; firstName: string };

        setShowOtpModal(false);

        await Swal.fire({
          icon: "success",
          title: "Registration Successful!",
          text: "Welcome to Gigly " + (data.firstName || formData.firstName),
          confirmButtonColor: "#2563eb",
        });
      } catch (error: unknown) {
        console.error(error);

        let message: string | string[] = "Verification Failed.";

        if (axios.isAxiosError<{ message: string | string[] }>(error)) {
          message = error.response?.data?.message || message;
        }

        await Swal.fire({
          icon: "error",
          title: "Verification Failed",
          text: Array.isArray(message) ? message.join(", ") : message,
          confirmButtonColor: "#2563eb",
        });

        // Clear OTP inputs on failure so user can retry
        setOtpValues(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [otpValues, formData.email, formData.firstName],
  );

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const sanitizedData = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/register/send-otp`,
        sanitizedData,
      );

      setResendCooldown(60);
      setOtpValues(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();

      await Swal.fire({
        icon: "success",
        title: "Code Resent!",
        text: "A new verification code has been sent to your email.",
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error: unknown) {
      console.error(error);

      let message: string | string[] = "Failed to resend code.";

      if (axios.isAxiosError<{ message: string | string[] }>(error)) {
        message = error.response?.data?.message || message;
      }

      await Swal.fire({
        icon: "error",
        title: "Resend Failed",
        text: Array.isArray(message) ? message.join(", ") : message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      <div
        className="hidden lg:flex w-1/2 text-white flex-col justify-between p-12 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/signup-hero.png')" }}
      >
        <div className="absolute inset-0 bg-slate-900/60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight">Gigly</span>
          </div>

          <div className="mt-auto pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Work when needed.
              <br />
              Earn when it matters.
            </h1>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Join thousands of professionals finding local and remote gigs
              every single day. Work flexibly, earn more.
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-16 relative bg-[#f8fafc]">
        {/* Top Toggle */}
        <div className="flex justify-center lg:justify-end w-full mb-12">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link to="/signup">
              <button className="px-6 py-2 bg-white rounded-md text-sm font-medium shadow-sm text-slate-900">
                Sign up
              </button>
            </Link>
            <Link to="/login">
              <button className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                Log in
              </button>
            </Link>
          </div>
        </div>

        <div className="w-full max-w-[440px] mx-auto space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Gigly
            </span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your details below to get started on Gigly.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-slate-700 text-sm font-semibold"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  required
                  className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName)
                      setErrors({ ...errors, firstName: "" });
                  }}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-slate-700 text-sm font-semibold"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  required
                  className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors({ ...errors, lastName: "" });
                  }}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-slate-700 text-sm font-semibold "
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-slate-700 text-sm font-semibold"
                >
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                required
                className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div className="pt-2">
              <Label className="text-slate-700 text-sm font-semibold block">
                How do you want to use Gigly?
              </Label>
              <div className="grid grid-cols-2 gap-4 mt-[15px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "WORKER" })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "WORKER"
                      ? "border-blue-500 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <UserCircle
                    className={`w-6 h-6 mb-2 ${formData.role === "WORKER" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-semibold">
                    I&apos;m a Worker
                  </span>
                  <span className="text-xs text-center mt-1 opacity-80">
                    Looking for gigs
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, role: "RECRUITER" })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "RECRUITER"
                      ? "border-blue-500 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <Building2
                    className={`w-6 h-6 mb-2 ${formData.role === "RECRUITER" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-semibold">
                    I&apos;m a Recruiter
                  </span>
                  <span className="text-xs text-center mt-1 opacity-80">
                    Hiring talent
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Sending verification code..." : "Create account"}
            </Button>

            <div className="relative py-4 mt-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f8fafc] px-2 text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 font-medium"
            >
              <Mail className="w-4 h-4" />
              Email Link
            </Button>

            <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
              By clicking continue, you agree to our{" "}
              <a href="#" className="underline hover:text-slate-700">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-slate-700">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>
      </div>

      {/* ─── OTP Verification Modal ─── */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOtpModal(false)}
          />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close verification modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Mail Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              Verify your email
            </h3>
            <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
              We&apos;ve sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-slate-700">
                {formData.email.trim().toLowerCase()}
              </span>
            </p>

            {/* OTP Input Boxes */}
            <div
              className="flex justify-center gap-3 mb-8"
              onPaste={handleOtpPaste}
            >
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                    ${
                      value
                        ? "border-blue-500 bg-blue-50/30 text-blue-700"
                        : "border-slate-200 bg-white text-slate-900"
                    }
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                  disabled={isVerifying}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              type="button"
              onClick={() => void handleVerifyOtp()}
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm mb-4"
              disabled={isVerifying || otpValues.some((v) => v === "")}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify & Create Account"
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-slate-500">
                Didn&apos;t receive the code?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-slate-400 font-medium">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleResendOtp()}
                    disabled={isResending}
                    className="text-blue-600 font-semibold hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isResending ? "Resending..." : "Resend code"}
                  </button>
                )}
              </p>
            </div>

            {/* Expiry Note */}
            <p className="text-xs text-slate-400 text-center mt-4">
              Code expires in 10 minutes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
