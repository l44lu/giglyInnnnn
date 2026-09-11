import React from "react";
import { Briefcase, Clock } from "lucide-react";

interface StatsCardsProps {
  activeJobsCount?: number;
  localJobsCount?: number;
  remoteJobsCount?: number;
  pendingRequestsCount?: number;
  className?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  activeJobsCount = 3,
  localJobsCount = 2,
  remoteJobsCount = 1,
  pendingRequestsCount = 5,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${className}`}>
      {/* Active Jobs */}
      <div className="rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Active Jobs
          </span>
          <Briefcase className="w-[18px] h-[18px] text-slate-400 stroke-[1.75]" />
        </div>

        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          {activeJobsCount}
        </div>

        <div className="text-xs text-slate-500 mt-2 font-normal">
          <span className="font-bold text-slate-800">{localJobsCount}</span>{" "}
          local ,{" "}
          <span className="font-bold text-slate-800">{remoteJobsCount}</span>{" "}
          remote
        </div>
      </div>

      {/* Pending Requests */}
      <div className="rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Pending Requests
          </span>
          <Clock className="w-[18px] h-[18px] text-slate-400 stroke-[1.75]" />
        </div>

        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          {pendingRequestsCount}
        </div>

        <div className="text-xs text-slate-500 mt-2 font-normal">
          Awaiting client response
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
