import React from "react";
import { TrendingUp } from "lucide-react";

export interface CategoryPerformanceItem {
  rank: string;
  name: string;
  activeGigs: string;
  avgHourlyPay: string;
  growth: string;
}

interface DemandingCategoriesProps {
  title?: string;
  subtitle?: string;
  categories?: CategoryPerformanceItem[];
  onViewAll?: () => void;
  className?: string;
}

const defaultCategories: CategoryPerformanceItem[] = [
  {
    rank: "#1",
    name: "Delivery & Drivers",
    activeGigs: "24,592",
    avgHourlyPay: "$18 - $25",
    growth: "24%",
  },
  {
    rank: "#2",
    name: "Handyman & Plumbing",
    activeGigs: "18,340",
    avgHourlyPay: "$35 - $50",
    growth: "18%",
  },
  {
    rank: "#3",
    name: "Web & App Development",
    activeGigs: "12,105",
    avgHourlyPay: "$45 - $80",
    growth: "12%",
  },
  {
    rank: "#4",
    name: "Content & Copywriting",
    activeGigs: "9,840",
    avgHourlyPay: "$20 - $40",
    growth: "8%",
  },
  {
    rank: "#5",
    name: "Virtual Assistance",
    activeGigs: "8,200",
    avgHourlyPay: "$15 - $25",
    growth: "5%",
  },
];

export const DemandingCategories: React.FC<DemandingCategoriesProps> = ({
  title = "Most Demanding Gig Categories",
  subtitle = "Top performing job categories based on active listings and worker applications.",
  categories = defaultCategories,
  onViewAll,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${className}`}
    >
      {/* Table Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-xs sm:text-sm font-semibold text-[#1877f2] hover:text-blue-700 transition-colors text-left sm:text-right cursor-pointer"
        >
          View All Report
        </button>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
              <th className="pb-3 pr-4 font-medium">Rank</th>
              <th className="pb-3 px-4 font-medium">Category Name</th>
              <th className="pb-3 px-4 font-medium">Total Active Gigs</th>
              <th className="pb-3 px-4 font-medium">Avg. Hourly Pay</th>
              <th className="pb-3 pl-4 font-medium text-right">Growth (30d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {categories.map((cat) => (
              <tr
                key={cat.rank}
                className="hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-4 pr-4 font-medium text-slate-500">
                  {cat.rank}
                </td>
                <td className="py-4 px-4 font-semibold text-slate-900">
                  {cat.name}
                </td>
                <td className="py-4 px-4 text-slate-600 font-medium">
                  {cat.activeGigs}
                </td>
                <td className="py-4 px-4 text-slate-600 font-medium">
                  {cat.avgHourlyPay}
                </td>
                <td className="py-4 pl-4 text-right font-medium text-emerald-600">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 stroke-[2.25]" />
                    {cat.growth}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemandingCategories;
