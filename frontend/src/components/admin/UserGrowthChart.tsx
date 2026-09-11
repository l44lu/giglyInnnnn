import React from "react";

interface MonthlyData {
  month: string;
  workers: number; // in thousands or percentage
  recruiters: number;
  workerHeight: string;
  recruiterHeight: string;
}

interface UserGrowthChartProps {
  title?: string;
  subtitle?: string;
  data?: MonthlyData[];
  className?: string;
}

const defaultMonthlyData: MonthlyData[] = [
  {
    month: "Jan",
    workers: 18000,
    recruiters: 6000,
    workerHeight: "35%",
    recruiterHeight: "15%",
  },
  {
    month: "Feb",
    workers: 28000,
    recruiters: 11000,
    workerHeight: "52%",
    recruiterHeight: "22%",
  },
  {
    month: "Mar",
    workers: 24000,
    recruiters: 13000,
    workerHeight: "45%",
    recruiterHeight: "25%",
  },
  {
    month: "Apr",
    workers: 42000,
    recruiters: 16000,
    workerHeight: "70%",
    recruiterHeight: "30%",
  },
  {
    month: "May",
    workers: 51000,
    recruiters: 19000,
    workerHeight: "82%",
    recruiterHeight: "36%",
  },
  {
    month: "Jun",
    workers: 64000,
    recruiters: 27000,
    workerHeight: "96%",
    recruiterHeight: "50%",
  },
];

export const UserGrowthChart: React.FC<UserGrowthChartProps> = ({
  title = "User Growth Trends",
  subtitle = "Recruiters vs Workers signups over the last 6 months",
  data = defaultMonthlyData,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between ${className}`}
    >
      {/* Header with Title and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#1877f2]" />
            <span>Workers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#e0eaff]" />
            <span>Recruiters</span>
          </div>
        </div>
      </div>

      {/* Chart visualization area */}
      <div className="mt-8 pt-4">
        <div className="h-48 sm:h-56 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-6 border-b border-slate-100">
          {data.map((item) => (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center h-full justify-end group"
            >
              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                {/* Workers Bar */}
                <div
                  style={{ height: item.workerHeight }}
                  className="w-4 sm:w-6 bg-[#1877f2] rounded-t-sm transition-all duration-300 group-hover:bg-blue-700 relative"
                  title={`Workers: ${item.workers.toLocaleString()}`}
                />
                {/* Recruiters Bar */}
                <div
                  style={{ height: item.recruiterHeight }}
                  className="w-4 sm:w-6 bg-[#e0eaff] rounded-t-sm transition-all duration-300 group-hover:bg-[#ccd9f8] relative"
                  title={`Recruiters: ${item.recruiters.toLocaleString()}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Month Labels */}
        <div className="flex items-center justify-between gap-2 sm:gap-6 px-2 sm:px-6 mt-3">
          {data.map((item) => (
            <div
              key={item.month}
              className="flex-1 text-center text-xs font-medium text-slate-500"
            >
              {item.month}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserGrowthChart;
