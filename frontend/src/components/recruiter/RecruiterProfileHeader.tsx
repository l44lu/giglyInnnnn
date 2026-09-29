import React from "react";
import { SquarePen } from "lucide-react";

export interface RecruiterProfileHeaderProps {
  isEditingDetails: boolean;
  isSavingDetails: boolean;
  isLoadingProfile: boolean;
  detailsError: string | null;
  profileError: string | null;
  onStartEditDetails: () => void;
  onCancelDetails: () => void;
  onSaveDetails: () => void;
  onDismissDetailsError: () => void;
  onRetryProfile: () => void;
}

export const RecruiterProfileHeader: React.FC<RecruiterProfileHeaderProps> = ({
  isEditingDetails,
  isSavingDetails,
  isLoadingProfile,
  detailsError,
  profileError,
  onStartEditDetails,
  onCancelDetails,
  onSaveDetails,
  onDismissDetailsError,
  onRetryProfile,
}) => {
  return (
    <>
      {/* Header Row: Title, Subtitle, and Primary Edit Details Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              aria-label="Recruiter Profile"
            >
              Recruiter profile
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              RECRUITER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Manage your recruiting role, company information, contact details,
            and account preferences.
          </p>
        </div>

        <div>
          {!isEditingDetails ? (
            <button
              type="button"
              onClick={onStartEditDetails}
              disabled={isLoadingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Edit Professional Details"
            >
              <SquarePen className="w-4 h-4 stroke-[2.2]" />
              <span>Edit Details</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelDetails}
                disabled={isSavingDetails}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200/90 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Cancel editing details"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDetails}
                disabled={isSavingDetails}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save details"
              >
                {isSavingDetails ? "Saving..." : "Save Details"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Professional Details error alert */}
      {detailsError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
        >
          <span>{detailsError}</span>
          <button
            type="button"
            onClick={onDismissDetailsError}
            className="text-red-500 hover:text-red-700 text-xs font-semibold ml-3 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile loading failure alert */}
      {profileError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
        >
          <span>{profileError}</span>
          <button
            type="button"
            onClick={onRetryProfile}
            className="text-amber-700 hover:text-amber-900 font-semibold underline ml-3 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
};
