import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AlertCircle, Building2, ChevronDown, Search, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecruiterTable } from "@/components/admin/recruiters/RecruiterTable";
import { RecruiterProfileModal } from "@/components/admin/recruiters/RecruiterProfileModal";
import {
  getAdminUser,
  getAdminUsers,
  setAdminUserBlockStatus,
} from "@/lib/admin-api";
import type { AdminUser } from "@/types/admin";

export const AdminRecruiters: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  // Profile modal states
  const [profileRecruiter, setProfileRecruiter] = useState<AdminUser | null>(
    null,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Block / Unblock action states
  const [blockingRecruiterId, setBlockingRecruiterId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // Ref tracking the in-flight profile request to prevent race conditions & stale overwrites
  const activeProfileRecruiterIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const data = await getAdminUsers();
        if (isMounted) {
          setUsers(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (axios.isAxiosError(err)) {
            const resData = err.response?.data as
              | { message?: string }
              | undefined;
            setError(
              resData?.message ||
                "Failed to load recruiters. Please try again.",
            );
          } else {
            setError("Failed to load recruiters. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as { message?: string } | undefined;
        setError(
          resData?.message || "Failed to load recruiters. Please try again.",
        );
      } else {
        setError("Failed to load recruiters. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "View Profile" click: exercises GET /admin/users/:userId
  const handleViewProfile = async (recruiterId: string) => {
    activeProfileRecruiterIdRef.current = recruiterId;
    setProfileRecruiter(null); // Clear previous recruiter to avoid showing stale data while loading
    setProfileError(null);
    setIsLoadingProfile(true);
    setIsModalOpen(true);

    try {
      const data = await getAdminUser(recruiterId);
      // Guard: only commit if this request is still the active profile request
      if (activeProfileRecruiterIdRef.current === recruiterId) {
        setProfileRecruiter(data);
      }
    } catch (err: unknown) {
      if (activeProfileRecruiterIdRef.current === recruiterId) {
        if (axios.isAxiosError(err)) {
          const resData = err.response?.data as
            | { message?: string }
            | undefined;
          setProfileError(
            resData?.message ||
              "Failed to load recruiter profile. Please try again.",
          );
        } else {
          setProfileError(
            "Failed to load recruiter profile. Please try again.",
          );
        }
      }
    } finally {
      if (activeProfileRecruiterIdRef.current === recruiterId) {
        setIsLoadingProfile(false);
      }
    }
  };

  const handleCloseModal = () => {
    activeProfileRecruiterIdRef.current = null; // Invalidate any in-flight profile request
    setIsModalOpen(false);
    setProfileRecruiter(null);
    setProfileError(null);
    setIsLoadingProfile(false);
  };

  // Handle "Block user / Unblock user" toggle: exercises PATCH /admin/users/:userId/block
  const handleToggleBlock = async (
    recruiterId: string,
    nextBlockedState: boolean,
  ) => {
    if (blockingRecruiterId) return; // Prevent concurrent duplicate submissions

    setBlockingRecruiterId(recruiterId);
    setActionError(null);

    try {
      const updatedUser = await setAdminUserBlockStatus(
        recruiterId,
        nextBlockedState,
      );

      // Update recruiter in directory dataset
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      );

      // Keep profile modal synchronized if currently open for the affected recruiter
      setProfileRecruiter((prev) =>
        prev && prev.id === updatedUser.id ? updatedUser : prev,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as { message?: string } | undefined;
        setActionError(
          resData?.message ||
            `Failed to ${nextBlockedState ? "block" : "unblock"} recruiter. Please try again.`,
        );
      } else {
        setActionError(
          `Failed to ${nextBlockedState ? "block" : "unblock"} recruiter. Please try again.`,
        );
      }
    } finally {
      setBlockingRecruiterId(null);
    }
  };

  // Derive all recruiter accounts (enforcing RECRUITER role safety)
  const recruiters = useMemo(
    () => users.filter((user) => user.role === "RECRUITER"),
    [users],
  );

  // Derive unique, non-empty locations dynamically from real recruiters dataset
  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    for (const recruiter of recruiters) {
      if (recruiter.location && recruiter.location.trim().length > 0) {
        locs.add(recruiter.location.trim());
      }
    }
    return Array.from(locs).sort((a, b) => a.localeCompare(b));
  }, [recruiters]);

  // Combine Search and Location filtering pipeline
  const filteredRecruiters = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return recruiters.filter((recruiter) => {
      // 1. Search filter across real supported fields: firstName, lastName, fullName, email, and id
      if (query) {
        const firstName = (recruiter.firstName || "").toLowerCase();
        const lastName = (recruiter.lastName || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = (recruiter.email || "").toLowerCase();
        const id = (recruiter.id || "").toLowerCase();

        const matchesSearch =
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          email.includes(query) ||
          id.includes(query);

        if (!matchesSearch) return false;
      }

      // 2. Location filter (handles null/undefined/empty locations safely)
      if (selectedLocation && selectedLocation !== "ALL") {
        const recruiterLoc = (recruiter.location || "").trim().toLowerCase();
        if (recruiterLoc !== selectedLocation.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [recruiters, searchTerm, selectedLocation]);

  return (
    <div
      data-testid="admin-recruiters-page"
      className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800"
    >
      {/* Collapsible / Responsive Navigation Sidebar */}
      <AdminSidebar activeTab="recruiters" />

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar with Profile & Notifications */}
        <AdminHeader />

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-12 space-y-8 max-w-7xl w-full mx-auto">
          {/* Header Row: Title & Subtitle */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Recruiters Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              A simpler admin view showing only the key recruiter details needed
              for quick moderation decisions.
            </p>
          </div>

          {/* Supported KPI Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div
              data-testid="kpi-recruiters-listed"
              className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs"
            >
              <div className="text-xs sm:text-sm font-medium text-slate-500">
                Recruiters listed
              </div>
              <div
                data-testid="kpi-recruiters-count"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2"
              >
                {isLoading ? (
                  <span className="text-slate-400 font-normal select-none">
                    —
                  </span>
                ) : error ? (
                  <span className="text-slate-400 font-normal select-none">
                    —
                  </span>
                ) : (
                  recruiters.length.toLocaleString()
                )}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                All recruiter accounts visible to admins
              </div>
            </div>
          </div>

          {/* Directory Content Container */}
          <div
            data-testid="admin-recruiters-container"
            className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs overflow-hidden"
          >
            {/* Header: Title + Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Basic recruiter information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Name, company, location, and quick admin actions.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                Simple moderation view
              </span>
            </div>

            {/* Action Mutation Error Banner */}
            {actionError && (
              <div
                data-testid="recruiter-action-error"
                className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  data-testid="btn-dismiss-action-error"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search & Location Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none stroke-[2]" />
                <input
                  type="text"
                  data-testid="input-recruiter-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by recruiter name, company, or ID..."
                  className="w-full bg-[#f8fafc] sm:bg-white border border-slate-200/90 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    data-testid="btn-clear-search"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Location Filter Select */}
              <div className="relative sm:w-48 shrink-0">
                <select
                  data-testid="select-recruiter-location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200/90 rounded-xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors cursor-pointer"
                  aria-label="Filter recruiters by location"
                >
                  <option value="ALL">All Locations</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none stroke-[1.75]" />
              </div>
            </div>

            {/* Dynamic Content: Loading / Error / Empty / Content Shell */}
            {isLoading ? (
              <div
                data-testid="recruiters-loading"
                className="py-16 text-center"
              >
                <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-[#1877f2] border-t-transparent mb-3" />
                <p className="text-xs sm:text-sm text-slate-500">
                  Loading recruiter directory...
                </p>
              </div>
            ) : error ? (
              <div
                data-testid="recruiters-error"
                className="py-12 px-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200/60 flex items-center justify-center mx-auto mb-3 text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Failed to load recruiters
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  {error}
                </p>
                <button
                  type="button"
                  data-testid="btn-retry-recruiters"
                  onClick={() => {
                    void handleRetry();
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1877f2] hover:bg-[#1565cc] text-white transition-colors cursor-pointer shadow-2xs"
                >
                  Retry
                </button>
              </div>
            ) : recruiters.length === 0 ? (
              <div
                data-testid="recruiters-directory-empty"
                className="py-16 px-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Building2 className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  No recruiters registered
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  There are currently no recruiter accounts in the system.
                </p>
              </div>
            ) : recruiters.length > 0 && filteredRecruiters.length === 0 ? (
              <div
                data-testid="recruiters-filter-empty"
                className="py-12 px-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  No matching recruiters
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No recruiters match your current search or location filter.
                </p>
                <button
                  type="button"
                  data-testid="btn-reset-filters"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLocation("ALL");
                  }}
                  className="mt-4 text-xs font-semibold text-[#1877f2] hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <RecruiterTable
                recruiters={filteredRecruiters}
                blockingRecruiterId={blockingRecruiterId}
                onToggleBlock={(recruiterId, nextBlockedState) => {
                  void handleToggleBlock(recruiterId, nextBlockedState);
                }}
                onViewProfile={(recruiterId) => {
                  void handleViewProfile(recruiterId);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Recruiter Profile Modal */}
      <RecruiterProfileModal
        isOpen={isModalOpen}
        recruiter={profileRecruiter}
        isLoading={isLoadingProfile}
        error={profileError}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default AdminRecruiters;
