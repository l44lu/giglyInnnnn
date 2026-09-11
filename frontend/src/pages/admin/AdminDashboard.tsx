import React, { useState } from "react";
import { Calendar, Download, ChevronDown } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { ActionRequired } from "@/components/admin/ActionRequired";
import { DemandingCategories } from "@/components/admin/DemandingCategories";

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const timeOptions = [
    "Last 7 Days",
    "Last 30 Days",
    "Last 3 Months",
    "Last 1 Year",
  ];

  return (
    <div className="flex min-h-screen bg-[#fafbfc] text-slate-900 antialiased font-sans">
      {/* Left Navigation Sidebar */}
      <AdminSidebar activeTab="dashboard" />

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar with Profile & Notifications */}
        <AdminHeader />

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-12 space-y-8 max-w-7xl w-full mx-auto">
          {/* Header Row: Title & Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Dashboard Overview
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Monitor platform health, user growth, and gig demands.
              </p>
            </div>

            {/* Filter & Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                  <span>{timeRange}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30">
                    {timeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setTimeRange(opt);
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Report Button */}
              <button
                type="button"
                className="bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.25]" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* Row 1: KPI Stats Cards */}
          <AdminStatsCards />

          {/* Row 2: User Growth Trends + Action Required */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: User Growth Chart (7 cols) */}
            <div className="lg:col-span-7">
              <UserGrowthChart />
            </div>

            {/* Right: Action Required (5 cols) */}
            <div className="lg:col-span-5">
              <ActionRequired />
            </div>
          </div>

          {/* Row 3: Most Demanding Gig Categories */}
          <DemandingCategories />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
