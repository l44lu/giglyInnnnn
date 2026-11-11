import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMetadata } from "@/types/job";

export interface JobPaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (page: number) => void;
  className?: string;
}

export const JobPagination: React.FC<JobPaginationProps> = ({
  pagination,
  onPageChange,
  className = "",
}) => {
  const { total, page, limit, totalPages } = pagination;

  const isFirstPage = page <= 1 || total === 0;
  const isLastPage = page >= totalPages || total === 0;

  // Calculate start and end indices
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);

  // Generate page numbers window (up to 5 pages around current)
  const getPageNumbers = (): number[] => {
    if (totalPages <= 1) return totalPages === 1 ? [1] : [];
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      aria-label="Job pagination navigation"
      data-testid="job-pagination"
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 ${className}`}
    >
      {/* Result count descriptor */}
      <div className="text-xs sm:text-sm text-slate-500 font-medium">
        {total === 0 ? (
          <span>No jobs to display</span>
        ) : (
          <span>
            Showing <strong className="text-slate-900">{startItem}</strong>–
            <strong className="text-slate-900">{endItem}</strong> of{" "}
            <strong className="text-slate-900">{total}</strong> jobs
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            aria-label="Go to previous page"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((p) => {
              const isActive = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-9 h-9 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1877f2] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            aria-label="Go to next page"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
};

export default JobPagination;
