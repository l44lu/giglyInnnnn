import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  changePassword,
  validateChangePasswordForm,
  type PasswordValidationErrors,
} from "@/lib/auth-api";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const WorkerChangePasswordCard: React.FC = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<PasswordValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setServerError(null);
    setIsChangingPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateChangePasswordForm({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
      });

      void Toast.fire({
        icon: "success",
        title: res.message || "Password changed successfully",
      });

      handleCancel();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        setServerError(msg || "Failed to change password. Please try again.");
      } else {
        setServerError("Failed to change password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Change password
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Keep your account secure by updating your password regularly and
            reviewing your sign-in activity when needed.
          </p>
        </div>
        {!isChangingPassword && (
          <button
            type="button"
            onClick={() => setIsChangingPassword(true)}
            className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 shadow-2xs transition-colors cursor-pointer"
            aria-label="Change Password"
          >
            Change Password
          </button>
        )}
      </div>

      {isChangingPassword && (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-6 pt-6 border-t border-slate-100 space-y-5"
        >
          {serverError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
            >
              <span>{serverError}</span>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-red-500 hover:text-red-700 text-xs font-semibold ml-3 cursor-pointer shrink-0"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5"
              >
                CURRENT PASSWORD
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        currentPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter your current password"
                  disabled={isSubmitting}
                  aria-label="Current Password"
                  aria-invalid={Boolean(errors.currentPassword)}
                  className={`w-full bg-white border ${
                    errors.currentPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200/90 focus:border-[#1877f2] focus:ring-[#1877f2]/20"
                  } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:cursor-not-allowed"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5"
              >
                NEW PASSWORD
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        newPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="At least 8 characters"
                  disabled={isSubmitting}
                  aria-label="New Password"
                  aria-invalid={Boolean(errors.newPassword)}
                  className={`w-full bg-white border ${
                    errors.newPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200/90 focus:border-[#1877f2] focus:ring-[#1877f2]/20"
                  } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:cursor-not-allowed"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5"
              >
                CONFIRM NEW PASSWORD
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Re-enter your new password"
                  disabled={isSubmitting}
                  aria-label="Confirm New Password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={`w-full bg-white border ${
                    errors.confirmPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200/90 focus:border-[#1877f2] focus:ring-[#1877f2]/20"
                  } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:cursor-not-allowed"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              aria-label="Cancel password change"
              className="border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Save new password"
              className="bg-[#1877f2] hover:bg-[#166fe5] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
