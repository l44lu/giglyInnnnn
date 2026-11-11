import React from "react";
import { Calendar, MapPin } from "lucide-react";
import { WorkType } from "@/types/job";

export interface TimeLocationSectionProps {
  startDate: string;
  onChangeStartDate: (val: string) => void;
  estimatedDuration: string;
  onChangeEstimatedDuration: (val: string) => void;
  shiftDuration: string;
  onChangeShiftDuration: (val: string) => void;
  jobLocation: string;
  onChangeJobLocation: (val: string) => void;
  workType: WorkType;
  disabled?: boolean;
}

const ESTIMATED_DURATION_OPTIONS = [
  "Less than 1 day",
  "Less than 1 week",
  "1 to 4 weeks",
  "1 to 3 months",
  "3+ months",
];

const SHIFT_DURATION_OPTIONS = [
  "Less than 1 hr",
  "1 to 2 hrs",
  "2 to 4 hrs",
  "4 to 8 hrs",
  "Full day (8+ hrs)",
];

export const TimeLocationSection: React.FC<TimeLocationSectionProps> = ({
  startDate,
  onChangeStartDate,
  estimatedDuration,
  onChangeEstimatedDuration,
  shiftDuration,
  onChangeShiftDuration,
  jobLocation,
  onChangeJobLocation,
  workType,
  disabled = false,
}) => {
  const isLocationRequired = workType === WorkType.LOCAL;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1877f2]">
          <Calendar className="w-4 h-4 stroke-[2.2]" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          3. Time &amp; Location
        </h2>
      </div>

      {/* Row 1: Start Date, Estimated Duration, Shift Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Start Date */}
        <div>
          <label
            htmlFor="start-date"
            className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
          >
            When does the work start? <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="start-date"
              type="date"
              value={startDate}
              disabled={disabled}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Estimated Duration */}
        <div>
          <label
            htmlFor="estimated-duration"
            className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
          >
            Estimated Duration
          </label>
          <div className="relative">
            <select
              id="estimated-duration"
              value={estimatedDuration}
              disabled={disabled}
              onChange={(e) => onChangeEstimatedDuration(e.target.value)}
              className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">Select duration</option>
              {ESTIMATED_DURATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
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
        </div>

        {/* Shift Duration */}
        <div>
          <label
            htmlFor="shift-duration"
            className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
          >
            Shift Duration
          </label>
          <div className="relative">
            <select
              id="shift-duration"
              value={shiftDuration}
              disabled={disabled}
              onChange={(e) => onChangeShiftDuration(e.target.value)}
              className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">Select shift duration</option>
              {SHIFT_DURATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
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
        </div>
      </div>

      {/* Row 2: Job Location (Plain Text) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label
            htmlFor="job-location"
            className="block text-xs sm:text-sm font-semibold text-slate-800"
          >
            Job Location
          </label>
          {isLocationRequired ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#1877f2] border border-blue-100">
              Required for On-site
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-normal text-slate-500 bg-slate-100">
              Optional for Remote
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Enter the venue or address where the task needs to be performed.
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
          <input
            id="job-location"
            type="text"
            value={jobLocation}
            disabled={disabled}
            onChange={(e) => onChangeJobLocation(e.target.value)}
            placeholder="Enter address, city, or zip code"
            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeLocationSection;
