import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  RotateCw,
  Search,
  Plus,
  MapPin,
  Globe,
  Calendar,
  Users,
  AlertCircle,
  X,
  Inbox,
  Layers,
  ArrowUpDown,
  Pencil,
  Pause,
  Play,
  XCircle,
  Loader2,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import {
  getRecruiterJobPosts,
  pauseRecruiterJobPost,
  reopenRecruiterJobPost,
  closeRecruiterJobPost,
} from "@/lib/job-api";
import {
  JobStatus,
  RecruiterJobStatusFilter,
  PaymentStructure,
  WorkType,
  type JobPost,
  type RecruiterJobPostsSummary,
} from "@/types/job";

type SortOption = "recent" | "oldest" | "title";

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

interface StatusTabConfig {
  id: RecruiterJobStatusFilter;
  label: string;
  getCount: (summary?: RecruiterJobPostsSummary) => number;
}

const STATUS_TABS: StatusTabConfig[] = [
  {
    id: RecruiterJobStatusFilter.ALL,
    label: "All",
    getCount: (s) => s?.total ?? 0,
  },
  {
    id: RecruiterJobStatusFilter.ACTIVE,
    label: "Active",
    getCount: (s) => s?.active ?? 0,
  },
  {
    id: RecruiterJobStatusFilter.DRAFT,
    label: "Drafts",
    getCount: (s) => s?.draft ?? 0,
  },
  {
    id: RecruiterJobStatusFilter.PAUSED,
    label: "Paused",
    getCount: (s) => s?.paused ?? 0,
  },
  {
    id: RecruiterJobStatusFilter.CLOSED,
    label: "Closed",
    getCount: (s) => s?.closed ?? 0,
  },
];

/**
 * Format relative time or clean date string.
 */
function formatPostDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format updated timestamp cleanly.
 */
function formatUpdatedDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Render appropriate status badge.
 */
function renderStatusBadge(status: string) {
  switch (status) {
    case "open":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Active
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          Draft
        </span>
      );
    case "paused":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Paused
        </span>
      );
    case "filled":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          Filled
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
          Completed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
}

/**
 * Check whether a job posting can be edited.
 * Only DRAFT, OPEN, and PAUSED jobs are editable.
 */
function canEditJob(status: JobStatus): boolean {
  return (
    status === JobStatus.DRAFT ||
    status === JobStatus.OPEN ||
    status === JobStatus.PAUSED
  );
}

export const MyPostings: React.FC = () => {
  // --------------------------------------------------------------------------
  // State: Tab selection & data
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<RecruiterJobStatusFilter>(
    RecruiterJobStatusFilter.ALL,
  );
  const [summary, setSummary] = useState<RecruiterJobPostsSummary | undefined>(
    undefined,
  );
  const [items, setItems] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // State: Client-side search and filters
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const response = await getRecruiterJobPosts({
          status: activeTab,
        });
        if (!isMounted) return;
        setSummary(response.summary);
        setItems(response.items ?? []);
      } catch (err: unknown) {
        if (!isMounted) return;
        let msg = "Failed to load job postings. Please try again.";
        if (err && typeof err === "object" && "message" in err) {
          msg = String(err.message);
        }
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const handleTabChange = (tabId: RecruiterJobStatusFilter) => {
    if (tabId === activeTab) return;
    setIsLoading(true);
    setErrorMessage(null);
    setActiveTab(tabId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await getRecruiterJobPosts({ status: activeTab });
      setSummary(response.summary);
      setItems(response.items ?? []);
    } catch (err: unknown) {
      let msg = "Failed to load job postings. Please try again.";
      if (err && typeof err === "object" && "message" in err) {
        msg = String(err.message);
      }
      setErrorMessage(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --------------------------------------------------------------------------
  // State & Handlers: Status Management Actions (Pause, Reopen, Close)
  // --------------------------------------------------------------------------
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<
    "pause" | "reopen" | "close" | null
  >(null);

  const handlePauseJob = async (job: JobPost) => {
    setActionLoadingId(job.id);
    setCurrentAction("pause");
    try {
      await pauseRecruiterJobPost(job.id);
      await Swal.fire({
        icon: "success",
        title: "Posting Paused",
        text: `"${job.title}" has been paused.`,
        timer: 2000,
        showConfirmButton: false,
      });
      await handleRefresh();
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to pause job posting. Please try again.",
      );
      await Swal.fire({
        icon: "error",
        title: "Failed to Pause",
        text: msg,
      });
    } finally {
      setActionLoadingId(null);
      setCurrentAction(null);
    }
  };

  const handleReopenJob = async (job: JobPost) => {
    setActionLoadingId(job.id);
    setCurrentAction("reopen");
    try {
      await reopenRecruiterJobPost(job.id);
      await Swal.fire({
        icon: "success",
        title: "Posting Reopened",
        text: `"${job.title}" is now active and visible to workers.`,
        timer: 2000,
        showConfirmButton: false,
      });
      await handleRefresh();
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to reopen job posting. Please try again.",
      );
      await Swal.fire({
        icon: "error",
        title: "Failed to Reopen",
        text: msg,
      });
    } finally {
      setActionLoadingId(null);
      setCurrentAction(null);
    }
  };

  const handleCloseJob = async (job: JobPost) => {
    const result = await Swal.fire({
      title: "Close this job posting?",
      text: `Are you sure you want to close "${job.title}"? Workers will no longer be able to apply.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, close it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(job.id);
    setCurrentAction("close");
    try {
      await closeRecruiterJobPost(job.id);
      await Swal.fire({
        icon: "success",
        title: "Posting Closed",
        text: `"${job.title}" has been closed.`,
        timer: 2000,
        showConfirmButton: false,
      });
      await handleRefresh();
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Failed to close job posting. Please try again.",
      );
      await Swal.fire({
        icon: "error",
        title: "Failed to Close",
        text: msg,
      });
    } finally {
      setActionLoadingId(null);
      setCurrentAction(null);
    }
  };

  // --------------------------------------------------------------------------
  // Unique Locations Extraction
  // --------------------------------------------------------------------------
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const loc = item.jobLocation?.trim();
      if (loc) {
        set.add(loc);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // --------------------------------------------------------------------------
  // Client-Side Search, Location Filter & Sort
  // --------------------------------------------------------------------------
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // 1. Text Search: Title, Category Name, Location, ID
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const catMatch = item.category?.name?.toLowerCase().includes(q);
        const locMatch = item.jobLocation?.toLowerCase().includes(q);
        const idMatch = item.id?.toLowerCase().includes(q);
        return titleMatch || catMatch || locMatch || idMatch;
      });
    }

    // 2. Location Filter
    if (selectedLocation !== "all") {
      result = result.filter((item) => item.jobLocation === selectedLocation);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      if (sortBy === "title") {
        return (a.title ?? "").localeCompare(b.title ?? "");
      }
      // Default: "recent" (by createdAt descending)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [items, searchQuery, selectedLocation, sortBy]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      {/* Left Sidebar */}
      <RecruiterSidebar activeTab="my-postings" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8 sm:py-10 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                My Postings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Track every gig you have posted, quickly update details, and
                keep hiring momentum high with clear status tabs, fast edit
                actions, and applicant visibility.
              </p>
            </div>

            <Link
              to="/recruiter/post-job"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Post New Gig</span>
            </Link>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-rose-900">
                  <p className="font-semibold">Unable to load job postings</p>
                  <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Active Posts */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Posts
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 stroke-[2]" />
                </div>
              </div>

              {isLoading && !summary ? (
                <div className="animate-pulse space-y-2 mt-2">
                  <div className="h-9 w-16 bg-slate-200 rounded-md" />
                  <div className="h-4 w-48 bg-slate-100 rounded-md" />
                </div>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
                    {summary?.active ?? 0}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    <span className="font-semibold text-slate-800">
                      {summary?.activeLocal ?? 0} local
                    </span>{" "}
                    gigs and{" "}
                    <span className="font-semibold text-slate-800">
                      {summary?.activeRemote ?? 0} remote
                    </span>{" "}
                    gigs currently visible to workers.
                  </p>
                </>
              )}
            </div>

            {/* Card 2: Total Gigs */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Gigs
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Layers className="w-5 h-5 stroke-[2]" />
                </div>
              </div>

              {isLoading && !summary ? (
                <div className="animate-pulse space-y-2 mt-2">
                  <div className="h-9 w-16 bg-slate-200 rounded-md" />
                  <div className="h-4 w-48 bg-slate-100 rounded-md" />
                </div>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
                    {summary?.total ?? 0}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    <span className="font-semibold text-slate-800">
                      {summary?.draft ?? 0} drafts
                    </span>
                    ,{" "}
                    <span className="font-semibold text-slate-800">
                      {summary?.paused ?? 0} paused
                    </span>
                    , and{" "}
                    <span className="font-semibold text-slate-800">
                      {summary?.closed ?? 0} closed
                    </span>{" "}
                    across your account.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Manage Your Job Posts Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="p-6 pb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Manage your job posts
              </h2>

              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={isRefreshing || isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/90 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh job postings"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>

            {/* Status Tabs Bar */}
            <div className="px-6 border-b border-slate-200 flex items-center gap-6 overflow-x-auto scrollbar-none">
              {STATUS_TABS.map((tab) => {
                const count = tab.getCount(summary);
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 pb-3.5 pt-1 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "border-blue-600 text-blue-600 font-semibold"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Toolbar: Search, Location Filter & Sort */}
            <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-200/70 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, category, location, or post ID..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2.5">
                {/* Location Filter */}
                {uniqueLocations.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                    >
                      <option value="all">All locations</option>
                      {uniqueLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                {/* Sort Option */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                  >
                    <option value="recent">Sort: Recent</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="title">Sort: Title</option>
                  </select>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table / List Area */}
            {isLoading && items.length === 0 ? (
              // Loading Skeleton Table
              <div className="divide-y divide-slate-100 p-6 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="animate-pulse flex flex-col sm:flex-row gap-4 justify-between items-start pt-3"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-64 bg-slate-200 rounded-md" />
                      <div className="h-4 w-40 bg-slate-100 rounded-md" />
                    </div>
                    <div className="h-4 w-28 bg-slate-100 rounded-md" />
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredAndSortedItems.length === 0 ? (
              // Empty State
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 stroke-[1.75]" />
                </div>

                {searchQuery || selectedLocation !== "all" ? (
                  // Search/Filter Empty State
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      No job postings match your filter
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try modifying your search term or resetting the location
                      filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedLocation("all");
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                  </div>
                ) : activeTab !== RecruiterJobStatusFilter.ALL ? (
                  // Tab Empty State
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      No {activeTab} job postings
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You do not have any job posts currently in the &quot;
                      {activeTab}&quot; status.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleTabChange(RecruiterJobStatusFilter.ALL)
                      }
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      View all postings
                    </button>
                  </div>
                ) : (
                  // Global Empty State
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      No job postings yet
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You haven&apos;t created any gigs yet. Create your first
                      job post to start discovering workers.
                    </p>
                    <Link
                      to="/recruiter/post-job"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post a New Gig</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              // Table List
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5 font-semibold">Job Post</th>
                      <th className="px-6 py-3.5 font-semibold">
                        Details & Workers
                      </th>
                      <th className="px-6 py-3.5 font-semibold">
                        Type & Budget
                      </th>
                      <th className="px-6 py-3.5 font-semibold">Updated</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {filteredAndSortedItems.map((job) => {
                      const isLocal = job.workType === WorkType.LOCAL;
                      const hasHourly =
                        job.paymentStructure === PaymentStructure.HOURLY;

                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* 1. Job Post Info */}
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-1">
                                {job.title}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                {isLocal ? (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{job.jobLocation || "Local"}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Remote</span>
                                  </span>
                                )}

                                {job.startDate && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{formatPostDate(job.startDate)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Details & Workers */}
                          <td className="px-6 py-4 align-top text-xs text-slate-600">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {job.workersNeeded} worker
                                  {job.workersNeeded > 1 ? "s" : ""} needed
                                </span>
                              </div>

                              {job.skills && job.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {job.skills.slice(0, 2).map((s) => (
                                    <span
                                      key={s.id}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                  {job.skills.length > 2 && (
                                    <span className="px-1 py-0.5 text-slate-400 text-[10px]">
                                      +{job.skills.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. Type & Budget */}
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-sm">
                                {hasHourly
                                  ? `$${job.hourlyRate ?? 0}/hr`
                                  : `Fixed $${job.budgetAmount ?? 0}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                {job.category?.name ?? "General"} · Posted{" "}
                                {formatPostDate(job.createdAt)}
                              </p>
                            </div>
                          </td>

                          {/* 4. Updated */}
                          <td className="px-6 py-4 align-top text-xs text-slate-500 whitespace-nowrap">
                            {formatUpdatedDate(job.updatedAt)}
                          </td>

                          {/* 5. Status Badge */}
                          <td className="px-6 py-4 align-top whitespace-nowrap">
                            {renderStatusBadge(job.status)}
                          </td>

                          {/* 6. Actions */}
                          <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {job.status === JobStatus.OPEN && (
                                <button
                                  type="button"
                                  onClick={() => void handlePauseJob(job)}
                                  disabled={actionLoadingId !== null}
                                  aria-label={`Pause ${job.title}`}
                                  title="Pause Gig"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoadingId === job.id &&
                                  currentAction === "pause" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Pause className="w-3.5 h-3.5" />
                                  )}
                                  <span>Pause</span>
                                </button>
                              )}

                              {job.status === JobStatus.PAUSED && (
                                <button
                                  type="button"
                                  onClick={() => void handleReopenJob(job)}
                                  disabled={actionLoadingId !== null}
                                  aria-label={`Reopen ${job.title}`}
                                  title="Reopen Gig"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoadingId === job.id &&
                                  currentAction === "reopen" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span>Reopen</span>
                                </button>
                              )}

                              {(job.status === JobStatus.OPEN ||
                                job.status === JobStatus.PAUSED) && (
                                <button
                                  type="button"
                                  onClick={() => void handleCloseJob(job)}
                                  disabled={actionLoadingId !== null}
                                  aria-label={`Close ${job.title}`}
                                  title="Close Gig"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoadingId === job.id &&
                                  currentAction === "close" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  <span>Close</span>
                                </button>
                              )}

                              {canEditJob(job.status) && (
                                <Link
                                  to={`/recruiter/jobs/${job.id}/edit`}
                                  aria-label={`Edit ${job.title}`}
                                  title="Edit Gig"
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                                    actionLoadingId !== null
                                      ? "pointer-events-none opacity-50"
                                      : ""
                                  }`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </Link>
                              )}

                              {!canEditJob(job.status) &&
                                job.status !== JobStatus.OPEN &&
                                job.status !== JobStatus.PAUSED && (
                                  <span className="text-slate-400 text-xs">
                                    —
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPostings;
