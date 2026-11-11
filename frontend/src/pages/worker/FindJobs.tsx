import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { AlertCircle, SearchX } from "lucide-react";
import { WorkerSidebar } from "@/components/worker/WorkerSidebar";
import {
  JobCard,
  JobCardSkeleton,
  JobFilters,
  JobPagination,
  JobDetailsModal,
  ReportJobModal,
} from "@/components/worker/job-discovery";
import { findOpenJobs } from "@/lib/worker-api";
import { getJobCategories } from "@/lib/job-api";
import {
  type JobDiscoveryItem,
  type WorkerJobDetails,
  type JobCategory,
  type PaginationMetadata,
  type FindJobsQuery,
  JobSortBy,
  WorkType,
  PaymentStructure,
} from "@/types/job";

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const FindJobs: React.FC = () => {
  // Data state
  const [jobs, setJobs] = useState<JobDiscoveryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined);
  const [workType, setWorkType] = useState<WorkType | undefined>(undefined);
  const [paymentStructure, setPaymentStructure] = useState<
    PaymentStructure | undefined
  >(undefined);
  const [minPay, setMinPay] = useState<number | undefined>(undefined);
  const [maxPay, setMaxPay] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<JobSortBy>(JobSortBy.RECENT);
  const [page, setPage] = useState<number>(1);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Job Details modal state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Report Job modal state
  const [reportingJob, setReportingJob] = useState<
    JobDiscoveryItem | WorkerJobDetails | null
  >(null);

  // Track latest request to ignore stale responses
  const requestIdRef = useRef<number>(0);

  // 1. Fetch categories on mount
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const data = await getJobCategories();
        if (isMounted) {
          setCategories(data);
        }
      } catch {
        // Failing to fetch category options shouldn't break the discovery page
        if (isMounted) {
          setCategories([]);
        }
      }
    };
    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(
      () => {
        setDebouncedSearch(search);
      },
      search === "" ? 0 : 350,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  // 3. Handlers for controlled filter state (auto-reset pagination to page 1)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((categoryId?: string) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  }, []);

  const handleWorkTypeChange = useCallback((type?: WorkType) => {
    setWorkType(type);
    setPage(1);
  }, []);

  const handlePaymentStructureChange = useCallback(
    (structure?: PaymentStructure) => {
      setPaymentStructure(structure);
      setPage(1);
    },
    [],
  );

  const handleMinPayChange = useCallback((value?: number) => {
    setMinPay(value);
    setPage(1);
  }, []);

  const handleMaxPayChange = useCallback((value?: number) => {
    setMaxPay(value);
    setPage(1);
  }, []);

  const handleLocationChange = useCallback((value?: string) => {
    setLocation(value);
    setPage(1);
  }, []);

  const handleSortByChange = useCallback((newSort: JobSortBy) => {
    setSortBy(newSort);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategoryId(undefined);
    setWorkType(undefined);
    setPaymentStructure(undefined);
    setMinPay(undefined);
    setMaxPay(undefined);
    setLocation(undefined);
    setSortBy(JobSortBy.RECENT);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  // 4. Fetch jobs query effect
  useEffect(() => {
    let isCancelled = false;
    const currentRequestId = ++requestIdRef.current;

    const loadJobs = async () => {
      const query: FindJobsQuery = {
        search: debouncedSearch.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
        workType: workType || undefined,
        paymentStructure: paymentStructure || undefined,
        minPay: minPay,
        maxPay: maxPay,
        location: location?.trim() || undefined,
        sortBy: sortBy,
        page: page,
        limit: 10,
      };

      try {
        const response = await findOpenJobs(query);
        if (!isCancelled && currentRequestId === requestIdRef.current) {
          setJobs(response.items || []);
          setPagination(
            response.pagination || {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          );
          setErrorMessage(null);
        }
      } catch (error: unknown) {
        if (!isCancelled && currentRequestId === requestIdRef.current) {
          setErrorMessage(
            extractErrorMessage(
              error,
              "Failed to load jobs. Please check your connection and try again.",
            ),
          );
        }
      } finally {
        if (!isCancelled && currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      if (!isCancelled && currentRequestId === requestIdRef.current) {
        setIsLoading(true);
        setErrorMessage(null);
      }
    });

    void loadJobs();

    return () => {
      isCancelled = true;
    };
  }, [
    debouncedSearch,
    selectedCategoryId,
    workType,
    paymentStructure,
    minPay,
    maxPay,
    location,
    sortBy,
    page,
    retryTrigger,
  ]);

  // Card action handlers
  const handleViewDetails = useCallback((item: JobDiscoveryItem) => {
    setSelectedJobId(item.id);
  }, []);

  const reportingJobRef = useRef<JobDiscoveryItem | WorkerJobDetails | null>(
    null,
  );

  useEffect(() => {
    reportingJobRef.current = reportingJob;
  }, [reportingJob]);

  const handleCloseDetails = useCallback(() => {
    if (reportingJobRef.current) return;
    setSelectedJobId(null);
  }, []);

  const handleApply = useCallback((item: JobDiscoveryItem) => {
    // Boundary placeholder: To be connected in Apply workflow step
    void item;
  }, []);

  const handleReport = useCallback((item: JobDiscoveryItem) => {
    setReportingJob(item);
  }, []);

  const handleReportFromDetails = useCallback((details: WorkerJobDetails) => {
    setReportingJob(details);
  }, []);

  const handleReportSuccess = useCallback(() => {
    setReportingJob(null);
    setSelectedJobId(null);
    void Toast.fire({
      icon: "success",
      title: "Report submitted successfully",
    });
  }, []);

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedCategoryId) ||
    Boolean(workType) ||
    Boolean(paymentStructure) ||
    minPay !== undefined ||
    maxPay !== undefined ||
    Boolean(location) ||
    sortBy !== JobSortBy.RECENT;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-sans">
      {/* Left Sidebar */}
      <WorkerSidebar activeTab="find-jobs" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-10 space-y-8">
          {/* Top Header Row with Title and JobFilters */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Find Jobs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Browse short-term shifts, local gigs, and quick paid work near
                you.
              </p>
            </div>

            <div className="w-full lg:max-w-xl">
              <JobFilters
                search={search}
                onSearchChange={handleSearchChange}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={handleCategoryChange}
                workType={workType}
                onWorkTypeChange={handleWorkTypeChange}
                paymentStructure={paymentStructure}
                onPaymentStructureChange={handlePaymentStructureChange}
                minPay={minPay}
                onMinPayChange={handleMinPayChange}
                maxPay={maxPay}
                onMaxPayChange={handleMaxPayChange}
                location={location}
                onLocationChange={handleLocationChange}
                sortBy={sortBy}
                onSortByChange={handleSortByChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>

          {/* Section Header: Available gigs for today and this week */}
          <div className="pt-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Available gigs for today and this week
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Simple listings for temporary workers looking for fast local jobs.
            </p>
          </div>

          {/* Content Area: Error Banner / Loading Skeletons / Empty State / Results Grid */}
          {errorMessage && (
            <div
              data-testid="find-jobs-error"
              className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 flex items-start justify-between gap-4 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-rose-900">
                    Unable to load available gigs
                  </h3>
                  <p className="text-xs sm:text-sm text-rose-700 mt-0.5">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div
              data-testid="find-jobs-loading"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <JobCardSkeleton key={idx} />
              ))}
            </div>
          ) : !errorMessage && jobs.length === 0 ? (
            <div
              data-testid="find-jobs-empty"
              className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center flex flex-col items-center justify-center shadow-2xs space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <SearchX className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  No jobs found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  We couldn&apos;t find any gigs matching your current filters
                  or search query. Try searching with different keywords or
                  clearing active filters.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : !errorMessage ? (
            <div
              data-testid="find-jobs-grid"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  item={job}
                  onViewDetails={handleViewDetails}
                  onApply={handleApply}
                  onReport={handleReport}
                />
              ))}
            </div>
          ) : null}

          {/* Pagination */}
          {!isLoading && !errorMessage && jobs.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <JobPagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        {/* Job Details Modal */}
        <JobDetailsModal
          jobId={selectedJobId}
          isOpen={Boolean(selectedJobId)}
          onClose={handleCloseDetails}
          onReport={handleReportFromDetails}
        />

        {/* Report Job Modal */}
        <ReportJobModal
          isOpen={Boolean(reportingJob)}
          job={reportingJob}
          onClose={() => setReportingJob(null)}
          onSuccess={handleReportSuccess}
        />
      </main>
    </div>
  );
};

export default FindJobs;
