import React, { useState } from "react";
import { Bookmark } from "lucide-react";

export interface JobMatchItem {
  id: string | number;
  title: string;
  description: string;
  price: string;
  priceType: string;
  tag: string;
  isBookmarked?: boolean;
  onApply?: () => void;
}

interface TopMatchesProps {
  title?: string;
  jobs?: JobMatchItem[];
  className?: string;
  onBookmarkToggle?: (id: string | number) => void;
}

const defaultJobs: JobMatchItem[] = [
  {
    id: "1",
    title: "React Native App Fixes",
    description:
      "Looking for an experienced dev to fix 3 specific bugs in our existing React Native application befo...",
    price: "$450",
    priceType: "Fixed",
    tag: "Remote",
    isBookmarked: false,
  },
  {
    id: "2",
    title: "Office IT Setup",
    description:
      "Need someone to set up 5 workstations, configure routers and printers at our new downtown office...",
    price: "$50/hr",
    priceType: "Est. 4h",
    tag: "Local",
    isBookmarked: false,
  },
];

export const TopMatches: React.FC<TopMatchesProps> = ({
  title = "Top Matches",
  jobs = defaultJobs,
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
        {jobs.map((job) => {
          const isSaved =
            bookmarkedState[String(job.id)] !== undefined
              ? bookmarkedState[String(job.id)]
              : !!job.isBookmarked;

          return (
            <div
              key={job.id}
              className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-200 group"
            >
              {/* Header: Title + Bookmark */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-slate-900 text-[15px] group-hover:text-[#1877f2] transition-colors leading-snug">
                  {job.title}
                </h4>
                <button
                  type="button"
                  onClick={() => handleBookmark(job.id)}
                  aria-label={`Save ${job.title}`}
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
              <p className="text-xs leading-relaxed text-slate-500 mt-2 line-clamp-2">
                {job.description}
              </p>

              {/* Bottom Info: Price & Tag */}
              <div className="flex items-center justify-between mt-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-bold text-slate-900 text-sm">
                    {job.price}
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span>{job.priceType}</span>
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  {job.tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TopMatches;
