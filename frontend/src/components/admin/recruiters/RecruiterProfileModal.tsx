import React from "react";
import { X, AlertCircle } from "lucide-react";
import type { AdminUser } from "@/types/admin";

export interface RecruiterProfileModalProps {
  isOpen: boolean;
  recruiter: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export const RecruiterProfileModal: React.FC<RecruiterProfileModalProps> = ({
  isOpen,
  recruiter,
  isLoading,
  error,
  onClose,
}) => {
  if (!isOpen) return null;

  const getAccountStatus = (r: AdminUser) => {
    if (r.isBlocked) {
      return {
        label: "Blocked",
        className: "bg-rose-50 text-rose-700 border-rose-200/60",
      };
    }
    if (!r.isActive) {
      return {
        label: "Inactive",
        className: "bg-slate-100 text-slate-600 border-slate-200/60",
      };
    }
    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    };
  };

  const fullName = recruiter
    ? `${recruiter.firstName || ""} ${recruiter.lastName || ""}`.trim() ||
      recruiter.email
    : "";

  const initials = recruiter
    ? `${recruiter.firstName?.[0] || ""}${recruiter.lastName?.[0] || ""}`.toUpperCase() ||
      "R"
    : "R";

  const status = recruiter ? getAccountStatus(recruiter) : null;

  const formattedDate = recruiter?.createdAt
    ? new Date(recruiter.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div
      data-testid="recruiter-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        data-testid="recruiter-profile-modal-card"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Recruiter Profile
          </h2>
          <button
            type="button"
            data-testid="btn-close-modal-x"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div data-testid="profile-loading" className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#1877f2] border-t-transparent mb-3" />
              <p className="text-sm font-medium text-slate-600">
                Loading recruiter profile...
              </p>
            </div>
          ) : error ? (
            <div data-testid="profile-error" className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200/60 flex items-center justify-center mx-auto mb-3 text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Failed to load profile
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto mb-6">
                {error}
              </p>
              <button
                type="button"
                data-testid="btn-close-error"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : recruiter ? (
            <div data-testid="profile-content" className="space-y-6">
              {/* Section 1: Identity */}
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    data-testid="profile-name"
                    className="text-lg font-bold text-slate-900 truncate"
                  >
                    {fullName}
                  </h3>
                  <p
                    data-testid="profile-id"
                    className="text-xs text-slate-500 font-mono mt-0.5 truncate"
                  >
                    ID: {recruiter.id}
                  </p>
                </div>
              </div>

              {/* Section 2: Contact & Profile */}
              <div className="pb-6 border-b border-slate-100 space-y-3.5">
                <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Contact & Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Email</span>
                    <span
                      data-testid="profile-email"
                      className="font-medium text-slate-800 break-all"
                    >
                      {recruiter.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Phone</span>
                    <span
                      data-testid="profile-phone"
                      className="font-medium text-slate-800"
                    >
                      {recruiter.phone || "Not provided"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 text-xs block">
                      Location
                    </span>
                    <span
                      data-testid="profile-location"
                      className="font-medium text-slate-800"
                    >
                      {recruiter.location || "Not provided"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block mb-1">Bio</span>
                  <p
                    data-testid="profile-bio"
                    className="text-xs sm:text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed whitespace-pre-line"
                  >
                    {recruiter.bio || "No bio provided."}
                  </p>
                </div>
              </div>

              {/* Section 3: Account Information */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Account Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Role</span>
                    <span
                      data-testid="profile-role"
                      className="font-semibold text-slate-800"
                    >
                      {recruiter.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">
                      Account Status
                    </span>
                    {status && (
                      <span
                        data-testid="profile-status"
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">
                      Member Since
                    </span>
                    <span
                      data-testid="profile-created-at"
                      className="font-medium text-slate-800 mt-1 block"
                    >
                      {formattedDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            data-testid="btn-close-profile-modal"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecruiterProfileModal;
