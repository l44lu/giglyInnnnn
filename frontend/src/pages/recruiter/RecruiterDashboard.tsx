import React from "react";
import { Bell } from "lucide-react";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import { RecruiterHeroCards } from "@/components/recruiter/RecruiterHeroCards";
import { RecruiterStatsCards } from "@/components/recruiter/RecruiterStatsCards";
import { RecruiterRecentActivity } from "@/components/recruiter/RecruiterRecentActivity";
import { TopCandidates } from "@/components/recruiter/TopCandidates";

export const RecruiterDashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-white text-slate-900 antialiased font-sans">
      {/* Left Sidebar */}
      <RecruiterSidebar activeTab="dashboard" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-white overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-10 space-y-8">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Welcome back, Sarah
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Here&apos;s what&apos;s happening with your hiring today.
              </p>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="p-2.5 rounded-full border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 stroke-[2]" />
              <span className="sr-only">Notifications</span>
            </button>
          </div>

          {/* Action Cards (Need to hire talent? / Looking for specific skills?) */}
          <RecruiterHeroCards />

          {/* Stats / Metric Cards */}
          <RecruiterStatsCards
            activePostingsCount={3}
            localPostingsCount={2}
            remotePostingsCount={1}
            pendingApplicantsCount={8}
          />

          {/* Bottom Section: Recent Activity + Top Candidates */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-2">
            {/* Left: Recent Activity (Spans 7 cols on large screens) */}
            <div className="lg:col-span-7">
              <RecruiterRecentActivity />
            </div>

            {/* Right: Top Candidates Component (Spans 5 cols on large screens) */}
            <div className="lg:col-span-5">
              <TopCandidates />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RecruiterDashboard;
