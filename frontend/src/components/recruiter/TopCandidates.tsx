import React, { useState } from "react";
import { Bookmark } from "lucide-react";

export interface CandidateItem {
  id: string | number;
  name: string;
  role: string;
  avatar: string;
  description: string;
  rate: string;
  ratingOrJobs: string;
  tag: string;
  isBookmarked?: boolean;
}

interface TopCandidatesProps {
  title?: string;
  candidates?: CandidateItem[];
  className?: string;
  onBookmarkToggle?: (id: string | number) => void;
}

const defaultCandidates: CandidateItem[] = [
  {
    id: "1",
    name: "Alex Johnson",
    role: "React Native Developer",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    description:
      "Experienced mobile developer with 5+ years building React Native apps for e-commerce and SaaS platforms.",
    rate: "$45/hr",
    ratingOrJobs: "Top Rated",
    tag: "Remote",
    isBookmarked: false,
  },
  {
    id: "2",
    name: "Emily Chen",
    role: "IT Setup Specialist",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    description:
      "IT professional specializing in office setups, network configuration, hardware deployment, and server maintenance.",
    rate: "$50/hr",
    ratingOrJobs: "15 jobs",
    tag: "Local",
    isBookmarked: false,
  },
];

export const TopCandidates: React.FC<TopCandidatesProps> = ({
  title = "Top Candidates",
  candidates = defaultCandidates,
  className = "",
  onBookmarkToggle,
}) => {
  const [bookmarkedState, setBookmarkedState] = useState<
    Record<string, boolean>
  >({});

  const handleBookmark = (id: string | number) => {
    const key = String(id);
    setBookmarkedState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (onBookmarkToggle) {
      onBookmarkToggle(id);
    }
  };

  return (
    <section className={`w-full ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">
        {title}
      </h3>

      <div className="space-y-4">
        {candidates.map((candidate) => {
          const isSaved =
            bookmarkedState[String(candidate.id)] !== undefined
              ? bookmarkedState[String(candidate.id)]
              : !!candidate.isBookmarked;

          return (
            <div
              key={candidate.id}
              className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-200 group"
            >
              {/* Header: Avatar + Info + Bookmark */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={candidate.avatar}
                    alt={candidate.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-[15px] group-hover:text-[#1877f2] transition-colors truncate">
                      {candidate.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-normal truncate">
                      {candidate.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookmark(candidate.id)}
                  aria-label={`Save ${candidate.name}`}
                  className="p-1 -mr-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-hidden"
                >
                  <Bookmark
                    className={`w-[18px] h-[18px] transition-colors ${
                      isSaved
                        ? "fill-[#1877f2] text-[#1877f2]"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed text-slate-500 mt-3 line-clamp-2">
                {candidate.description}
              </p>

              {/* Bottom Info: Rate & Tag */}
              <div className="flex items-center justify-between mt-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-bold text-slate-900 text-sm">
                    {candidate.rate}
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span>{candidate.ratingOrJobs}</span>
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  {candidate.tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TopCandidates;
