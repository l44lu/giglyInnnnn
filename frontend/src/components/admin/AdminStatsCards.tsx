import React from "react";
import {
  Users,
  Building2,
  Briefcase,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";

interface AdminStatItem {
  id: string;
  title: string;
  value: string;
  growth: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminStatsCardsProps {
  stats?: AdminStatItem[];
  className?: string;
}

const defaultStats: AdminStatItem[] = [
  {
    id: "workers",
    title: "Total Workers",
    value: "145,200",
    growth: "+12.5% from last month",
    icon: Users,
  },
  {
    id: "recruiters",
    title: "Total Recruiters",
    value: "32,450",
    growth: "+8.2% from last month",
    icon: Building2,
  },
  {
    id: "gigs",
    title: "Active Gigs",
    value: "84,302",
    growth: "+15.3% from last month",
    icon: Briefcase,
  },
  {
    id: "revenue",
    title: "Platform Revenue",
    value: "$2.4M",
    growth: "+22.4% from last month",
    icon: CircleDollarSign,
  },
];

export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  stats = defaultStats,
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}
    >
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200 transition-all duration-200"
          >
            {/* Header: Title + Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {item.title}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50/80 flex items-center justify-center text-[#1877f2]">
                <Icon className="w-4 h-4 stroke-[1.75]" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="text-2xl sm:text-[26px] font-extrabold text-slate-900 mt-2 tracking-tight">
              {item.value}
            </div>

            {/* Growth indicator */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mt-2">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>{item.growth}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStatsCards;
