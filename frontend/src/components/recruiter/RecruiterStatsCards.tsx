import React from "react";
import { Briefcase, Clock } from "lucide-react";

interface RecruiterStatsCardsProps {
  activePostingsCount?: number;
  localPostingsCount?: number;
  remotePostingsCount?: number;
  pendingApplicantsCount?: number;
  className?: string;
}

export const RecruiterStatsCards: React.FC<RecruiterStatsCardsProps> = ({
  activePostingsCount = 3,
  localPostingsCount = 2,
  remotePostingsCount = 1,
  pendingApplicantsCount = 8,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${className}`}>
      {/* Active Postings */}
      <div className="rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Active Postings
          </span>
          <Briefcase className="w-[18px] h-[18px] text-slate-400 stroke-[1.75]" />
        </div>

        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          {activePostingsCount}
        </div>

        <div className="text-xs text-slate-500 mt-2 font-normal">
          <span className="font-bold text-slate-800">{localPostingsCount}</span>{" "}
          local ,{" "}
          <span className="font-bold text-slate-800">
            {remotePostingsCount}
          </span>{" "}
          remote
        </div>
      </div>

      {/* Pending Applicants */}
      <div className="rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Pending Applicants
          </span>
          <Clock className="w-[18px] h-[18px] text-slate-400 stroke-[1.75]" />
        </div>

        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          {pendingApplicantsCount}
        </div>

        <div className="text-xs text-slate-500 mt-2 font-normal">
          Awaiting your review
        </div>
      </div>
    </div>
  );
};

export default RecruiterStatsCards;
