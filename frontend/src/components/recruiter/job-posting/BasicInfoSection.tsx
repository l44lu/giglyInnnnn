import React from "react";
import { FileText, AlertCircle, RefreshCw } from "lucide-react";
import { WorkType, type JobCategory } from "@/types/job";

export interface BasicInfoSectionProps {
  title: string;
  onChangeTitle: (val: string) => void;
  categoryId: string;
  onChangeCategoryId: (val: string) => void;
  workType: WorkType;
  onChangeWorkType: (val: WorkType) => void;
  categories: JobCategory[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onRetryCategories?: () => void;
  disabled?: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  title,
  onChangeTitle,
  categoryId,
  onChangeCategoryId,
  workType,
  onChangeWorkType,
  categories,
  isLoadingCategories,
  categoriesError,
  onRetryCategories,
  disabled = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1877f2]">
          <FileText className="w-4 h-4 stroke-[2.2]" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          1. Basic Information
        </h2>
      </div>

      {/* Job Title */}
      <div>
        <label
          htmlFor="job-title"
          className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
        >
          Job Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="job-title"
          type="text"
          value={title}
          disabled={disabled}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="e.g. Need a freelance graphic designer for a logo"
          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>

      {/* Two Column Row: Category & Work Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Job Category */}
        <div>
          <label
            htmlFor="job-category"
            className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
          >
            Job Category <span className="text-rose-500">*</span>
          </label>

          {categoriesError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs text-rose-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Failed to load categories</span>
              </div>
              {onRetryCategories && (
                <button
                  type="button"
                  onClick={onRetryCategories}
                  className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-800 underline underline-offset-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          ) : categories.length === 0 && !isLoadingCategories ? (
            <div className="space-y-1.5">
              <select
                id="job-category"
                disabled
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
                value=""
              >
                <option value="">No categories available</option>
              </select>
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Categories are not currently available.</span>
              </p>
            </div>
          ) : (
            <div className="relative">
              <select
                id="job-category"
                value={categoryId}
                onChange={(e) => onChangeCategoryId(e.target.value)}
                disabled={disabled || isLoadingCategories}
                className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingCategories
                    ? "Loading categories..."
                    : "Select a category"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Work Type */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
            Work Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Remote */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeWorkType(WorkType.REMOTE)}
              className={`h-11 px-3.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm font-medium transition-all ${
                disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              } ${
                workType === WorkType.REMOTE
                  ? "border-[#1877f2] bg-blue-50/60 text-[#1877f2] shadow-2xs ring-1 ring-[#1877f2]/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  workType === WorkType.REMOTE
                    ? "border-[#1877f2] bg-[#1877f2]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {workType === WorkType.REMOTE && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>Remote</span>
            </button>

            {/* On-site / Local */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeWorkType(WorkType.LOCAL)}
              className={`h-11 px-3.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm font-medium transition-all ${
                disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              } ${
                workType === WorkType.LOCAL
                  ? "border-[#1877f2] bg-blue-50/60 text-[#1877f2] shadow-2xs ring-1 ring-[#1877f2]/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  workType === WorkType.LOCAL
                    ? "border-[#1877f2] bg-[#1877f2]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {workType === WorkType.LOCAL && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>On-site / Local</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;
