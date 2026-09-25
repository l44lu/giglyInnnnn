import React from "react";

export interface WorkerProfileStatsProps {
  totalCompletedGigs: number;
  memberSince: string;
  responseTimeDisplay: string;
  isEditingDetails: boolean;
  isSavingDetails: boolean;
  customResponseTimeHours: string | null;
  onChangeResponseTimeHours: (value: string) => void;
}

export const WorkerProfileStats: React.FC<WorkerProfileStatsProps> = ({
  totalCompletedGigs,
  memberSince,
  responseTimeDisplay,
  isEditingDetails,
  isSavingDetails,
  customResponseTimeHours,
  onChangeResponseTimeHours,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#f8fafc] border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          COMPLETED JOBS
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-1.5">
          {totalCompletedGigs}
        </p>
      </div>

      <div className="bg-[#f8fafc] border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          CLIENTS
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-1.5">—</p>
      </div>

      <div className="bg-[#f8fafc] border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          RESPONSE TIME
        </p>
        {isEditingDetails ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="1"
              value={customResponseTimeHours ?? ""}
              onChange={(e) => onChangeResponseTimeHours(e.target.value)}
              placeholder="—"
              disabled={isSavingDetails}
              aria-label="Response time hours"
              className="w-20 bg-white border border-slate-200/90 rounded-lg px-2 py-1 text-sm font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-slate-500 font-medium">hrs</span>
          </div>
        ) : (
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {responseTimeDisplay}
          </p>
        )}
      </div>

      <div className="bg-[#f8fafc] border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          MEMBER SINCE
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-1.5">
          {memberSince}
        </p>
      </div>
    </div>
  );
};
