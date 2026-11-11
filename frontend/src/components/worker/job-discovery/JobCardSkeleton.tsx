import React from "react";

export interface JobCardSkeletonProps {
  className?: string;
}

export const JobCardSkeleton: React.FC<JobCardSkeletonProps> = ({
  className = "",
}) => {
  return (
    <div
      data-testid="job-card-skeleton"
      className={`rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between animate-pulse ${className}`}
    >
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-slate-200 rounded-md w-3/4" />
            <div className="h-4 bg-slate-100 rounded-md w-1/3" />
          </div>
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-7 bg-slate-200 rounded-md w-20" />
            <div className="h-3 bg-slate-100 rounded-md w-12" />
          </div>
        </div>

        {/* Relative time placeholder */}
        <div className="h-3 bg-slate-100 rounded-md w-40 mt-3" />

        {/* Badges placeholder */}
        <div className="flex items-center gap-2 mt-3.5">
          <div className="h-5 bg-slate-100 rounded-full w-16" />
          <div className="h-5 bg-slate-100 rounded-full w-20" />
          <div className="h-5 bg-slate-100 rounded-full w-28" />
        </div>

        {/* Description lines */}
        <div className="space-y-2 mt-4">
          <div className="h-3.5 bg-slate-100 rounded-md w-full" />
          <div className="h-3.5 bg-slate-100 rounded-md w-5/6" />
          <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
        </div>

        {/* Skills chips */}
        <div className="flex items-center gap-2 mt-4">
          <div className="h-6 bg-slate-100 rounded-lg w-20" />
          <div className="h-6 bg-slate-100 rounded-lg w-24" />
          <div className="h-6 bg-slate-100 rounded-lg w-20" />
        </div>
      </div>

      {/* Footer Row */}
      <div className="pt-6 mt-6 border-t border-slate-100 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="h-2.5 bg-slate-100 rounded-sm w-16" />
            <div className="h-4 bg-slate-200 rounded-md w-28" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 bg-slate-100 rounded-sm w-12" />
            <div className="h-4 bg-slate-200 rounded-md w-32" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-slate-200 rounded-xl" />
          <div className="w-24 h-9 bg-slate-200 rounded-xl" />
          <div className="w-24 h-9 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default JobCardSkeleton;
