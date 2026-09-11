import React from "react";
import { Search, PlusCircle, Compass, Briefcase } from "lucide-react";

interface HeroActionCardsProps {
  onFindJobs?: () => void;
  onPostJob?: () => void;
  className?: string;
}

export const HeroActionCards: React.FC<HeroActionCardsProps> = ({
  onFindJobs,
  onPostJob,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${className}`}>
      {/* Looking for new work? */}
      <div className="relative overflow-hidden rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-6 flex flex-col justify-between min-h-[160px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        {/* Large Faint Watermark Background Icon */}
        <div className="absolute -right-4 -bottom-4 pointer-events-none select-none text-sky-500/10 dark:text-sky-500/5">
          <Compass className="w-36 h-36 stroke-[1.25]" />
        </div>

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Looking for new work?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Browse hundreds of local and remote gigs.
          </p>
        </div>

        <div className="relative z-10 mt-5">
          <button
            type="button"
            onClick={onFindJobs}
            className="inline-flex items-center gap-2 bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Find Jobs</span>
          </button>
        </div>
      </div>

      {/* Need an extra hand? */}
      <div className="relative overflow-hidden rounded-2xl bg-[#f8fafc] border border-slate-100/90 p-6 flex flex-col justify-between min-h-[160px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        {/* Large Faint Watermark Background Icon */}
        <div className="absolute -right-4 -bottom-4 pointer-events-none select-none text-sky-500/10 dark:text-sky-500/5">
          <Briefcase className="w-36 h-36 stroke-[1.25]" />
        </div>

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Need an extra hand?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Hire someone to help you with a task.
          </p>
        </div>

        <div className="relative z-10 mt-5">
          <button
            type="button"
            onClick={onPostJob}
            className="inline-flex items-center gap-2 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1877f2] border border-blue-100 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Job</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroActionCards;
