import React from "react";
import { Flag } from "lucide-react";

export interface ActionRequiredItem {
  id: string | number;
  title: string;
  count: number;
  description: string;
  onReview?: () => void;
}

interface ActionRequiredProps {
  title?: string;
  items?: ActionRequiredItem[];
  className?: string;
  onItemReview?: (id: string | number) => void;
}

const defaultItems: ActionRequiredItem[] = [
  {
    id: "reported-listings",
    title: "Reported Listings",
    count: 8,
    description: "Gigs flagged for term violations",
  },
];

export const ActionRequired: React.FC<ActionRequiredProps> = ({
  title = "Action Required",
  items = defaultItems,
  className = "",
  onItemReview,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between ${className}`}
    >
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-5">
          {title}
        </h3>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#f8fafc] rounded-2xl p-4 sm:p-5 border border-slate-100/90 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="text-red-500 mt-0.5 shrink-0">
                  <Flag className="w-5 h-5 stroke-[2] fill-red-500/10" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h4>
                    <span className="inline-flex items-center justify-center bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px]">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (item.onReview) item.onReview();
                    if (onItemReview) onItemReview(item.id);
                  }}
                  className="bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1877f2] text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionRequired;
