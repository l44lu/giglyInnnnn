import React from "react";
import { Clock, MapPin, Calendar, Flag, Globe } from "lucide-react";
import { type JobDiscoveryItem, WorkType, PaymentStructure } from "@/types/job";

export interface JobCardProps {
  item: JobDiscoveryItem;
  onViewDetails?: (item: JobDiscoveryItem) => void;
  onApply?: (item: JobDiscoveryItem) => void;
  onReport?: (item: JobDiscoveryItem) => void;
  className?: string;
}

/**
 * Formats a Date/ISO string to human relative time (e.g. "Posted 1 hour ago", "Posted today").
 */
// eslint-disable-next-line react-refresh/only-export-components
export const formatRelativeTime = (isoString?: string): string => {
  if (!isoString) return "Recently posted";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Recently posted";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    if (diffMin <= 1) return "Posted just now";
    return `Posted ${diffMin} minutes ago`;
  }
  if (diffHours === 1) return "Posted 1 hour ago";
  if (diffHours < 24) return `Posted ${diffHours} hours ago`;
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 7) return `Posted ${diffDays} days ago`;
  return `Posted ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

/**
 * Formats start date into a clean scheduling label (e.g. "Tonight, 7:00 PM", "Tomorrow, 9:00 AM").
 */
// eslint-disable-next-line react-refresh/only-export-components
export const formatStartDate = (isoString?: string | null): string => {
  if (!isoString) return "Flexible start";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Flexible start";

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    const hours = date.getHours();
    const prefix = hours >= 17 ? "Tonight" : "Today";
    return `${prefix}, ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${timeStr}`;
  }

  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dayOfWeek}, ${monthDay} • ${timeStr}`;
};

/**
 * Returns formatted compensation and rate type based on fixed vs hourly payment structure.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const formatCompensation = (
  item: JobDiscoveryItem,
): { amount: string; label: string } => {
  if (item.paymentStructure === PaymentStructure.HOURLY) {
    const rate =
      typeof item.hourlyRate === "number" ? `$${item.hourlyRate}/hr` : "—";
    const label = item.estimatedDuration
      ? item.estimatedDuration.toLowerCase().startsWith("est")
        ? item.estimatedDuration
        : `Est. ${item.estimatedDuration}`
      : "Hourly";
    return { amount: rate, label };
  }

  // FIXED payment structure
  const budget =
    typeof item.budgetAmount === "number" ? `$${item.budgetAmount}` : "—";
  const label = item.shiftDuration
    ? item.shiftDuration.toLowerCase().includes("shift")
      ? item.shiftDuration
      : `${item.shiftDuration} shift`
    : "Per shift";
  return { amount: budget, label };
};

export const JobCard: React.FC<JobCardProps> = ({
  item,
  onViewDetails,
  onApply,
  onReport,
  className = "",
}) => {
  const companyName = item.company?.name?.trim() || "Independent Recruiter";
  const { amount: compensationAmount, label: compensationLabel } =
    formatCompensation(item);
  const relativeTime = formatRelativeTime(item.createdAt);
  const formattedStart = formatStartDate(item.startDate);
  const isLocal = item.workType === WorkType.LOCAL;

  const displayLocation =
    item.jobLocation?.trim() || (isLocal ? "Local on-site" : "Remote");

  return (
    <article
      data-testid={`job-card-${item.id}`}
      className={`rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-300 transition-all ${className}`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug line-clamp-2">
              {item.title}
            </h3>
            <p className="text-sm font-semibold text-[#1877f2] mt-0.5 truncate">
              {companyName}
            </p>
          </div>

          {/* Compensation Block */}
          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {compensationAmount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {compensationLabel}
            </div>
          </div>
        </div>

        {/* Relative Time & Timing Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{relativeTime}</span>
          {item.shiftDuration && (
            <>
              <span className="text-slate-300">•</span>
              <span className="truncate">{item.shiftDuration}</span>
            </>
          )}
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Work Type Pill */}
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isLocal
                ? "bg-blue-50 text-blue-700 border border-blue-100/60"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100/60"
            }`}
          >
            {isLocal ? (
              <MapPin className="w-3 h-3 shrink-0" />
            ) : (
              <Globe className="w-3 h-3 shrink-0" />
            )}
            <span>{isLocal ? "Local" : "Remote"}</span>
          </span>

          {/* Duration Badge */}
          {item.estimatedDuration && (
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {item.estimatedDuration}
            </span>
          )}

          {/* Category Badge */}
          {item.category?.name && (
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[180px]">
              {item.category.name}
            </span>
          )}
        </div>

        {/* Job Description */}
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed mt-3.5">
          {item.description}
        </p>

        {/* Skills Chips */}
        {item.skills && item.skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {item.skills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200/90 text-slate-600 bg-white"
              >
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Row: Location, Schedule & Actions */}
      <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        {/* Location & Start Schedule */}
        <div className="space-y-2 text-left min-w-0">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              LOCATION
            </span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 truncate mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              START
            </span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 truncate mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formattedStart}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Report Button */}
          <button
            type="button"
            onClick={() => onReport?.(item)}
            aria-label="Report job"
            title="Report this listing"
            className="p-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Flag className="w-4 h-4 text-white fill-white" />
          </button>

          {/* View Details Button */}
          <button
            type="button"
            onClick={() => onViewDetails?.(item)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            View Details
          </button>

          {/* Apply Now Button */}
          <button
            type="button"
            onClick={() => onApply?.(item)}
            className="px-4 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Apply Now
          </button>
        </div>
      </div>
    </article>
  );
};

export default JobCard;
