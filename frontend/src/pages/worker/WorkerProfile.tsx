import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  getWorkerProfile,
  updateWorkerProfile,
  parseIntegerOrNull,
  uploadWorkerAvatar,
  getAvatarVersion,
  setAvatarVersion,
} from "@/lib/worker-api";
import type { UpdateWorkerProfilePayload } from "@/lib/worker-api";
import type { WorkerProfileResponse } from "@/types/worker-profile";
import {
  WorkerSidebar,
  WorkerProfileHeader,
  WorkerProfileOverview,
  WorkerProfileStats,
  WorkerPersonalInfoCard,
  WorkerSkillsCard,
  WorkerChangePasswordCard,
} from "@/components/worker";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const defaultProfileValues: WorkerProfileResponse = {
  id: "",
  userId: "",
  headline: "",
  yearsExperience: null,
  responseTimeHours: null,
  availabilityStatus: "available",
  isOpenToWork: true,
  totalCompletedGigs: 0,
  createdAt: "",
  updatedAt: "",
};

export const WorkerProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersionState] = useState<number | undefined>(
    () => getAvatarVersion(),
  );

  // Profile data states
  const [profile, setProfile] = useState<WorkerProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Active profile values combining real data or honest defaults
  const activeProfile = profile ?? defaultProfileValues;

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [customHeadline, setCustomHeadline] = useState<string | null>(null);
  const [customResponseTimeHours, setCustomResponseTimeHours] = useState<
    string | null
  >(null);
  const [customIsOpenToWork, setCustomIsOpenToWork] = useState<boolean | null>(
    null,
  );

  const displayName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "Worker";

  const handleStartEditingDetails = () => {
    if (isLoadingProfile) return;
    setCustomHeadline(activeProfile.headline ?? "");
    setCustomResponseTimeHours(
      activeProfile.responseTimeHours !== null &&
        activeProfile.responseTimeHours !== undefined
        ? activeProfile.responseTimeHours.toString()
        : "",
    );
    setCustomIsOpenToWork(activeProfile.isOpenToWork);
    setDetailsError(null);
    setIsEditingDetails(true);
  };

  const handleCancelDetails = () => {
    setCustomHeadline(null);
    setCustomResponseTimeHours(null);
    setCustomIsOpenToWork(null);
    setDetailsError(null);
    setIsEditingDetails(false);
  };

  const handleSaveDetails = async () => {
    if (isSavingDetails) return;
    const rawHeadline = customHeadline ?? activeProfile.headline ?? "";
    const trimmedHeadline = rawHeadline.trim();
    const headlinePayload = trimmedHeadline.length > 0 ? trimmedHeadline : null;

    const rawResponseTime =
      customResponseTimeHours ??
      (activeProfile.responseTimeHours !== null &&
      activeProfile.responseTimeHours !== undefined
        ? activeProfile.responseTimeHours.toString()
        : "");
    const parsedResponseTime = parseIntegerOrNull(rawResponseTime);
    if (Number.isNaN(parsedResponseTime)) {
      setDetailsError(
        "Response time must be a non-negative whole number of hours.",
      );
      return;
    }

    const isOpenToWorkPayload =
      customIsOpenToWork ?? activeProfile.isOpenToWork;

    const payload: UpdateWorkerProfilePayload = {
      headline: headlinePayload,
      responseTimeHours: parsedResponseTime,
      isOpenToWork: isOpenToWorkPayload,
    };

    setIsSavingDetails(true);
    setDetailsError(null);

    try {
      const updatedProfile = await updateWorkerProfile(payload);
      setProfile(updatedProfile);
      setCustomHeadline(null);
      setCustomResponseTimeHours(null);
      setCustomIsOpenToWork(null);
      setIsEditingDetails(false);
      void Toast.fire({
        icon: "success",
        title: "Professional profile updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        setDetailsError(
          msg || "Failed to update professional profile. Please try again.",
        );
      } else {
        setDetailsError(
          "Failed to update professional profile. Please try again.",
        );
      }
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleUploadAvatar = async (file: File): Promise<void> => {
    if (isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      await uploadWorkerAvatar(file);
      await refreshUser();
      const newVersion = Date.now();
      setAvatarVersion(newVersion);
      setAvatarVersionState(newVersion);
      void Toast.fire({
        icon: "success",
        title: "Avatar updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        void Toast.fire({
          icon: "error",
          title: msg || "Failed to upload avatar. Please try again.",
        });
      } else {
        void Toast.fire({
          icon: "error",
          title: "Failed to upload avatar. Please try again.",
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Load real WorkerProfile data on mount or retry
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const data = await getWorkerProfile();
        // If data is null (HTTP 404 Worker profile not found), fall back to default profile
        if (isMounted) {
          setProfile(data);
          setProfileError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (axios.isAxiosError(err)) {
            const resData = err.response?.data as
              | { message?: string }
              | undefined;
            setProfileError(
              resData?.message ||
                "Failed to load worker profile. Please try again.",
            );
          } else {
            setProfileError("Failed to load worker profile. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = () => {
    if (isLoadingProfile) return;
    setProfileError(null);
    setIsLoadingProfile(true);
    setRetryCount((prev) => prev + 1);
  };

  // Member since derived honestly from authenticated user createdAt
  const memberSince = user?.createdAt
    ? (() => {
        const year = new Date(user.createdAt).getFullYear();
        return isNaN(year) ? "—" : year.toString();
      })()
    : "—";

  // Formatted response time
  const responseTimeDisplay =
    activeProfile.responseTimeHours !== null &&
    activeProfile.responseTimeHours !== undefined
      ? `${activeProfile.responseTimeHours} hrs`
      : "—";

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-sans">
      {/* Left Navigation Sidebar */}
      <WorkerSidebar activeTab="profile" avatarVersion={avatarVersion} />

      {/* Main Profile Content Area */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-10 space-y-8">
          {/* Header Row & Error Alerts */}
          <WorkerProfileHeader
            isEditingDetails={isEditingDetails}
            isSavingDetails={isSavingDetails}
            isLoadingProfile={isLoadingProfile}
            detailsError={detailsError}
            profileError={profileError}
            onStartEditDetails={handleStartEditingDetails}
            onCancelDetails={handleCancelDetails}
            onSaveDetails={() => {
              void handleSaveDetails();
            }}
            onDismissDetailsError={() => setDetailsError(null)}
            onRetryProfile={handleRetry}
          />

          {/* Loading Indicator */}
          {isLoadingProfile ? (
            <div
              data-testid="profile-loading"
              className="flex flex-col items-center justify-center py-24 gap-3"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1877f2] border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">
                Loading profile...
              </p>
            </div>
          ) : (
            /* Main Layout Grid: Left Profile Card + Stats & Right Structured Details */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Profile Summary & Stats */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-5">
                <WorkerProfileOverview
                  displayName={displayName}
                  avatarUrl={user?.avatarUrl}
                  avatarVersion={avatarVersion}
                  isUploadingAvatar={isUploadingAvatar}
                  onUploadAvatar={handleUploadAvatar}
                  location={user?.location}
                  bio={user?.bio}
                  headline={activeProfile.headline}
                  isOpenToWork={activeProfile.isOpenToWork}
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  customHeadline={customHeadline}
                  onChangeHeadline={setCustomHeadline}
                  customIsOpenToWork={customIsOpenToWork}
                  onToggleIsOpenToWork={() =>
                    setCustomIsOpenToWork(
                      !(customIsOpenToWork ?? activeProfile.isOpenToWork),
                    )
                  }
                />

                <WorkerProfileStats
                  totalCompletedGigs={activeProfile.totalCompletedGigs}
                  memberSince={memberSince}
                  responseTimeDisplay={responseTimeDisplay}
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  customResponseTimeHours={customResponseTimeHours}
                  onChangeResponseTimeHours={setCustomResponseTimeHours}
                />
              </div>

              {/* Right Column: Personal Information, Change Password, and Skills */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <WorkerPersonalInfoCard />
                <WorkerChangePasswordCard />
                <WorkerSkillsCard />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkerProfile;
