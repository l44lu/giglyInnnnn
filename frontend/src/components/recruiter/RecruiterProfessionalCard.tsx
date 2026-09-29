import React from "react";
import type { RecruiterProfileResponse } from "@/types/recruiter-profile";
import { Briefcase, Calendar } from "lucide-react";

export interface RecruiterProfessionalCardProps {
  profile: RecruiterProfileResponse | null;
  isEditingDetails: boolean;
  isSavingDetails: boolean;
  customRoleTitle: string | null;
  onChangeRoleTitle: (value: string) => void;
  customYearsExperience: string | null;
  onChangeYearsExperience: (value: string) => void;
}

export const RecruiterProfessionalCard: React.FC<
  RecruiterProfessionalCardProps
> = ({
  profile,
  isEditingDetails,
  isSavingDetails,
  customRoleTitle,
  onChangeRoleTitle,
  customYearsExperience,
  onChangeYearsExperience,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Professional Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Information regarding your role and professional background.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {/* Role Title */}
        <div>
          <label
            htmlFor="professional-role-title"
            className="block text-xs font-semibold text-slate-900 mb-1.5"
          >
            Role / Job Title
          </label>
          {isEditingDetails ? (
            <input
              id="professional-role-title"
              type="text"
              value={customRoleTitle ?? ""}
              onChange={(e) => onChangeRoleTitle(e.target.value)}
              placeholder="e.g. Senior Recruiter"
              disabled={isSavingDetails}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>{profile?.roleTitle || "—"}</span>
            </div>
          )}
        </div>

        {/* Years of Experience */}
        <div>
          <label
            htmlFor="professional-years-experience"
            className="block text-xs font-semibold text-slate-900 mb-1.5"
          >
            Years of Experience
          </label>
          {isEditingDetails ? (
            <input
              id="professional-years-experience"
              type="number"
              min="0"
              step="1"
              value={customYearsExperience ?? ""}
              onChange={(e) => onChangeYearsExperience(e.target.value)}
              placeholder="e.g. 5"
              disabled={isSavingDetails}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {profile?.yearsExperience !== null &&
                profile?.yearsExperience !== undefined
                  ? `${profile.yearsExperience} ${
                      profile.yearsExperience === 1 ? "year" : "years"
                    }`
                  : "—"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
