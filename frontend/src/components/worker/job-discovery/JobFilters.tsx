import React, { useState } from "react";
import { Search, SlidersHorizontal, X, RotateCcw, MapPin } from "lucide-react";
import {
  type JobCategory,
  JobSortBy,
  WorkType,
  PaymentStructure,
} from "@/types/job";

export interface JobFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categories: JobCategory[];
  selectedCategoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
  workType?: WorkType;
  onWorkTypeChange: (workType?: WorkType) => void;
  paymentStructure?: PaymentStructure;
  onPaymentStructureChange: (paymentStructure?: PaymentStructure) => void;
  minPay?: number;
  onMinPayChange: (minPay?: number) => void;
  maxPay?: number;
  onMaxPayChange: (maxPay?: number) => void;
  location?: string;
  onLocationChange: (location?: string) => void;
  sortBy?: JobSortBy;
  onSortByChange: (sortBy: JobSortBy) => void;
  onClearFilters: () => void;
  className?: string;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  search,
  onSearchChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  workType,
  onWorkTypeChange,
  paymentStructure,
  onPaymentStructureChange,
  minPay,
  onMinPayChange,
  maxPay,
  onMaxPayChange,
  location,
  onLocationChange,
  sortBy = JobSortBy.RECENT,
  onSortByChange,
  onClearFilters,
  className = "",
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Calculate active filter count (excluding search and default sort)
  let activeFilterCount = 0;
  if (selectedCategoryId) activeFilterCount++;
  if (workType) activeFilterCount++;
  if (paymentStructure) activeFilterCount++;
  if (minPay !== undefined && !isNaN(minPay)) activeFilterCount++;
  if (maxPay !== undefined && !isNaN(maxPay)) activeFilterCount++;
  if (location && location.trim().length > 0) activeFilterCount++;
  if (sortBy && sortBy !== JobSortBy.RECENT) activeFilterCount++;

  const handleMinPayInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (val === "") {
      onMinPayChange(undefined);
    } else {
      const num = Number(val);
      if (!isNaN(num) && num >= 0) {
        onMinPayChange(num);
      }
    }
  };

  const handleMaxPayInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (val === "") {
      onMaxPayChange(undefined);
    } else {
      const num = Number(val);
      if (!isNaN(num) && num >= 0) {
        onMaxPayChange(num);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="job-filters">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for shifts, delivery, setup jobs..."
            aria-label="Search jobs"
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            aria-expanded={isPanelOpen}
            aria-label="Toggle filters panel"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs ${
              isPanelOpen || activeFilterCount > 0
                ? "border-blue-600 bg-blue-50/60 text-blue-700 hover:bg-blue-100/60"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1877f2] text-white text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Clear Button (when filters are active) */}
          {(activeFilterCount > 0 || search.length > 0) && (
            <button
              type="button"
              onClick={onClearFilters}
              aria-label="Clear all filters"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Reset all filters and search"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filter Controls Panel */}
      {isPanelOpen && (
        <div
          data-testid="job-filters-panel"
          className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] space-y-5 animate-in fade-in-50 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Filter Available Gigs
            </h4>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Close filters panel"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label
                htmlFor="filter-category"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Category
              </label>
              <div className="relative">
                <select
                  id="filter-category"
                  value={selectedCategoryId || ""}
                  onChange={(e) =>
                    onCategoryChange(e.target.value || undefined)
                  }
                  className="w-full text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Work Type Filter */}
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Mode
              </span>
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => onWorkTypeChange(undefined)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    !workType
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => onWorkTypeChange(WorkType.LOCAL)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    workType === WorkType.LOCAL
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Local
                </button>
                <button
                  type="button"
                  onClick={() => onWorkTypeChange(WorkType.REMOTE)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    workType === WorkType.REMOTE
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Remote
                </button>
              </div>
            </div>

            {/* Payment Structure Filter */}
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Type
              </span>
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => onPaymentStructureChange(undefined)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    !paymentStructure
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onPaymentStructureChange(PaymentStructure.HOURLY)
                  }
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentStructure === PaymentStructure.HOURLY
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hourly
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onPaymentStructureChange(PaymentStructure.FIXED)
                  }
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentStructure === PaymentStructure.FIXED
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Fixed
                </button>
              </div>
            </div>

            {/* Pay Range (Min & Max) */}
            <div>
              <label
                htmlFor="filter-min-pay"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Pay Range ($)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">
                    $
                  </span>
                  <input
                    id="filter-min-pay"
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPay !== undefined ? minPay : ""}
                    onChange={handleMinPayInput}
                    aria-label="Minimum pay"
                    className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <span className="text-slate-400 text-xs">—</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">
                    $
                  </span>
                  <input
                    id="filter-max-pay"
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPay !== undefined ? maxPay : ""}
                    onChange={handleMaxPayInput}
                    aria-label="Maximum pay"
                    className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Location Text Search */}
            <div>
              <label
                htmlFor="filter-location"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Location
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="filter-location"
                  type="text"
                  placeholder="e.g. Seattle, Dallas, Chicago..."
                  value={location || ""}
                  onChange={(e) => onLocationChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label
                htmlFor="filter-sort-by"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Sort By
              </label>
              <div className="relative">
                <select
                  id="filter-sort-by"
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value as JobSortBy)}
                  className="w-full text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value={JobSortBy.RECENT}>Most Recent</option>
                  <option value={JobSortBy.PAY_HIGH}>Highest Pay</option>
                  <option value={JobSortBy.PAY_LOW}>Lowest Pay</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFilters;
