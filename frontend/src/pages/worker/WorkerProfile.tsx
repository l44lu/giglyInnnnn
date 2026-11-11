import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  getWorkerProfile,
  updateWorkerProfile,
  parseIntegerOrNull,
  uploadWorkerAvatar,
  removeWorkerAvatar,
  getAvatarVersion,
  setAvatarVersion,
  updateWorkerPersonalProfile,
  parseFullName,
  formatNullableField,
  getSkillCatalog,
  getWorkerSkills,
  updateWorkerSkills,
} from "@/lib/worker-api";
import type {
  UpdateWorkerProfilePayload,
  UpdateWorkerPersonalProfilePayload,
} from "@/lib/worker-api";
import type {
  WorkerProfileResponse,
  Skill,
  WorkerSkill,
} from "@/types/worker-profile";
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
  iconColor: "#1877f2",
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
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersionState] = useState<number | undefined>(
    () => getAvatarVersion(),
  );

  // Profile data states (saved baseline)
  const [profile, setProfile] = useState<WorkerProfileResponse | null>(null);
  const [savedSkills, setSavedSkills] = useState<WorkerSkill[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);

  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Active profile values combining real data or honest defaults
  const activeProfile = profile ?? defaultProfileValues;

  // Unified editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Personal Info Drafts
  const [customFullName, setCustomFullName] = useState<string>("");
  const [customPhone, setCustomPhone] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [customBio, setCustomBio] = useState<string>("");

  // Professional Details Drafts
  const [customHeadline, setCustomHeadline] = useState<string>("");
  const [customResponseTimeHours, setCustomResponseTimeHours] =
    useState<string>("");
  const [customIsOpenToWork, setCustomIsOpenToWork] = useState<boolean>(true);

  // Skills Drafts
  const [draftSkillIds, setDraftSkillIds] = useState<string[]>([]);

  const currentSavedName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "";

  const displayName = currentSavedName || "Worker";

  // Unified edit start: populate drafts from latest accepted saved baselines
  const handleStartEditingDetails = () => {
    if (isLoadingProfile || isLoadingSkills) return;

    // Personal baselines
    setCustomFullName(currentSavedName);
    setCustomPhone(user?.phone ?? "");
    setCustomLocation(user?.location ?? "");
    setCustomBio(user?.bio ?? "");

    // Professional baselines
    setCustomHeadline(activeProfile.headline ?? "");
    setCustomResponseTimeHours(
      activeProfile.responseTimeHours !== null &&
        activeProfile.responseTimeHours !== undefined
        ? activeProfile.responseTimeHours.toString()
        : "",
    );
    setCustomIsOpenToWork(activeProfile.isOpenToWork);

    // Skills baselines
    setDraftSkillIds(savedSkills.map((s) => s.skillId));

    setDetailsError(null);
    setIsEditingDetails(true);
  };

  // Unified cancel: discard unsaved edits, restore from latest accepted baselines
  const handleCancelDetails = () => {
    setCustomFullName(currentSavedName);
    setCustomPhone(user?.phone ?? "");
    setCustomLocation(user?.location ?? "");
    setCustomBio(user?.bio ?? "");

    setCustomHeadline(activeProfile.headline ?? "");
    setCustomResponseTimeHours(
      activeProfile.responseTimeHours !== null &&
        activeProfile.responseTimeHours !== undefined
        ? activeProfile.responseTimeHours.toString()
        : "",
    );
    setCustomIsOpenToWork(activeProfile.isOpenToWork);

    setDraftSkillIds(savedSkills.map((s) => s.skillId));

    setDetailsError(null);
    setIsEditingDetails(false);
  };

  // Add / Remove skills in draft state
  const handleAddSkill = (skillId: string) => {
    if (isSavingDetails) return;
    if (draftSkillIds.includes(skillId)) return;
    setDraftSkillIds((prev) => [...prev, skillId]);
  };

  const handleRemoveSkill = (skillIdToRemove: string) => {
    if (isSavingDetails) return;
    setDraftSkillIds((prev) => prev.filter((id) => id !== skillIdToRemove));
  };

  // Unified save coordinator
  const handleSaveDetails = async () => {
    if (isSavingDetails) return;

    // --- Saved baselines ---
    const savedName = currentSavedName.trim();
    const savedPhone = (user?.phone ?? "").trim();
    const savedLocation = (user?.location ?? "").trim();
    const savedBio = (user?.bio ?? "").trim();

    const savedHeadline = (activeProfile.headline ?? "").trim();
    const savedResponseTime =
      activeProfile.responseTimeHours !== null &&
      activeProfile.responseTimeHours !== undefined
        ? activeProfile.responseTimeHours.toString().trim()
        : "";
    const savedIsOpenToWork = activeProfile.isOpenToWork;

    const savedSkillIds = savedSkills.map((s) => s.skillId);

    // --- Draft values ---
    const draftFullName = customFullName.trim();
    const draftPhone = customPhone.trim();
    const draftLocation = customLocation.trim();
    const draftBio = customBio.trim();

    const draftHeadline = customHeadline.trim();
    const draftResponseTime = customResponseTimeHours.trim();
    const draftIsOpenToWork = customIsOpenToWork;

    // --- Dirty checking per section ---
    const isPersonalDirty =
      draftFullName !== savedName ||
      draftPhone !== savedPhone ||
      draftLocation !== savedLocation ||
      draftBio !== savedBio;

    const isProfessionalDirty =
      draftHeadline !== savedHeadline ||
      draftResponseTime !== savedResponseTime ||
      draftIsOpenToWork !== savedIsOpenToWork;

    const isSkillsDirty =
      draftSkillIds.length !== savedSkillIds.length ||
      draftSkillIds.some((id, idx) => id !== savedSkillIds[idx]);

    // --- Preflight Validation ---
    if (isPersonalDirty && draftFullName.length === 0) {
      setDetailsError("Full name is required.");
      return;
    }

    const parsedResponseTime = parseIntegerOrNull(draftResponseTime);
    if (
      isProfessionalDirty &&
      draftResponseTime.length > 0 &&
      Number.isNaN(parsedResponseTime)
    ) {
      setDetailsError(
        "Response time must be a non-negative whole number of hours.",
      );
      return;
    }

    // --- No changes to save ---
    if (!isPersonalDirty && !isProfessionalDirty && !isSkillsDirty) {
      setIsEditingDetails(false);
      setDetailsError(null);
      void Toast.fire({
        icon: "info",
        title: "No changes to save.",
      });
      return;
    }

    // --- Execute dirty sections in parallel ---
    setIsSavingDetails(true);
    setDetailsError(null);

    interface Task {
      id: "personal" | "professional" | "skills";
      displayName: string;
      execute: () => Promise<void>;
    }

    const tasks: Task[] = [];

    if (isPersonalDirty) {
      tasks.push({
        id: "personal",
        displayName: "Personal Information",
        execute: async () => {
          const { firstName, lastName } = parseFullName(draftFullName);
          const payload: UpdateWorkerPersonalProfilePayload = {
            firstName,
            lastName,
            phone: formatNullableField(customPhone),
            location: formatNullableField(customLocation),
            bio: formatNullableField(customBio),
          };
          await updateWorkerPersonalProfile(payload);
          await refreshUser();
        },
      });
    }

    if (isProfessionalDirty) {
      tasks.push({
        id: "professional",
        displayName: "Professional Details",
        execute: async () => {
          const payload: UpdateWorkerProfilePayload = {
            headline: draftHeadline.length > 0 ? draftHeadline : null,
            responseTimeHours: parsedResponseTime,
            isOpenToWork: draftIsOpenToWork,
          };
          const updated = await updateWorkerProfile(payload);
          setProfile(updated);
        },
      });
    }

    if (isSkillsDirty) {
      tasks.push({
        id: "skills",
        displayName: "Skills",
        execute: async () => {
          const updated = await updateWorkerSkills(draftSkillIds);
          setSavedSkills(updated);
        },
      });
    }

    try {
      const results = await Promise.allSettled(tasks.map((t) => t.execute()));

      const succeeded: string[] = [];
      const failed: { name: string; error: string }[] = [];

      results.forEach((res, index) => {
        const task = tasks[index];
        if (res.status === "fulfilled") {
          succeeded.push(task.displayName);
        } else {
          let msg = "Failed to update.";
          if (axios.isAxiosError(res.reason)) {
            const resData = res.reason.response?.data as
              | { message?: string | string[] }
              | undefined;
            msg = Array.isArray(resData?.message)
              ? resData.message.join(", ")
              : resData?.message || res.reason.message || "Failed to update.";
          } else if (res.reason instanceof Error) {
            msg = res.reason.message;
          }
          failed.push({ name: task.displayName, error: msg });
        }
      });

      if (failed.length === 0) {
        setIsEditingDetails(false);
        setDetailsError(null);
        void Toast.fire({
          icon: "success",
          title: "Profile updated successfully",
        });
      } else if (succeeded.length === 0) {
        // All attempted updates failed: keep page in edit mode, preserve draft values
        const errorSummary = failed
          .map((f) => `${f.name}: ${f.error}`)
          .join(" | ");
        setDetailsError(errorSummary);
      } else {
        // Partial failure: keep page in edit mode, preserve unsaved drafts, update saved baseline
        const succSummary = succeeded.join(", ");
        const failSummary = failed
          .map((f) => `${f.name} (${f.error})`)
          .join("; ");
        setDetailsError(
          `Saved: ${succSummary}. Failed: ${failSummary}. Please review unsaved changes and try again.`,
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

  const handleRemoveAvatar = async (): Promise<void> => {
    if (isRemovingAvatar || isUploadingAvatar) return;
    setIsRemovingAvatar(true);
    let removalSucceeded = false;
    try {
      await removeWorkerAvatar();
      removalSucceeded = true;
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
          title: msg || "Failed to remove avatar. Please try again.",
        });
      } else {
        void Toast.fire({
          icon: "error",
          title: "Failed to remove avatar. Please try again.",
        });
      }
      throw err;
    } finally {
      setIsRemovingAvatar(false);
    }

    if (removalSucceeded) {
      const newVersion = Date.now();
      setAvatarVersion(newVersion);
      setAvatarVersionState(newVersion);

      try {
        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          void Toast.fire({
            icon: "warning",
            title: "Avatar removed, but profile sync failed. Please refresh.",
          });
          return;
        }
      } catch {
        void Toast.fire({
          icon: "warning",
          title: "Avatar removed, but profile sync failed. Please refresh.",
        });
        return;
      }

      void Toast.fire({
        icon: "success",
        title: "Avatar removed successfully",
      });
    }
  };

  // Load real WorkerProfile data, SkillCatalog, and WorkerSkills on mount or retry
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingProfile(true);
      setIsLoadingSkills(true);
      setProfileError(null);
      setSkillsError(null);

      try {
        const [profileData, catalogData, workerSkillsData] =
          await Promise.allSettled([
            getWorkerProfile(),
            getSkillCatalog(),
            getWorkerSkills(),
          ]);

        if (!isMounted) return;

        if (profileData.status === "fulfilled") {
          setProfile(profileData.value);
        } else {
          const err: unknown = profileData.reason;
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

        if (catalogData.status === "fulfilled") {
          setSkillsCatalog(catalogData.value);
        } else {
          setSkillsError("Failed to load skills catalog.");
        }

        if (workerSkillsData.status === "fulfilled") {
          setSavedSkills(workerSkillsData.value);
        } else {
          setSkillsError("Failed to load worker skills.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
          setIsLoadingSkills(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = () => {
    if (isLoadingProfile) return;
    if (isLoadingSkills) return;
    setProfileError(null);
    setSkillsError(null);
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
                  isRemovingAvatar={isRemovingAvatar}
                  onRemoveAvatar={handleRemoveAvatar}
                  location={user?.location}
                  bio={user?.bio}
                  headline={activeProfile.headline}
                  isOpenToWork={activeProfile.isOpenToWork}
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  customHeadline={
                    isEditingDetails
                      ? customHeadline
                      : (activeProfile.headline ?? "")
                  }
                  onChangeHeadline={setCustomHeadline}
                  customIsOpenToWork={
                    isEditingDetails
                      ? customIsOpenToWork
                      : activeProfile.isOpenToWork
                  }
                  onToggleIsOpenToWork={() =>
                    setCustomIsOpenToWork((prev) => !prev)
                  }
                />

                <WorkerProfileStats
                  totalCompletedGigs={activeProfile.totalCompletedGigs}
                  memberSince={memberSince}
                  responseTimeDisplay={responseTimeDisplay}
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  customResponseTimeHours={
                    isEditingDetails
                      ? customResponseTimeHours
                      : activeProfile.responseTimeHours !== null &&
                          activeProfile.responseTimeHours !== undefined
                        ? activeProfile.responseTimeHours.toString()
                        : ""
                  }
                  onChangeResponseTimeHours={setCustomResponseTimeHours}
                />
              </div>

              {/* Right Column: Personal Information, Change Password, and Skills */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <WorkerPersonalInfoCard
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  fullName={
                    isEditingDetails ? customFullName : currentSavedName
                  }
                  onChangeFullName={setCustomFullName}
                  phone={isEditingDetails ? customPhone : (user?.phone ?? "")}
                  onChangePhone={setCustomPhone}
                  location={
                    isEditingDetails ? customLocation : (user?.location ?? "")
                  }
                  onChangeLocation={setCustomLocation}
                  bio={isEditingDetails ? customBio : (user?.bio ?? "")}
                  onChangeBio={setCustomBio}
                />

                <WorkerChangePasswordCard />

                <WorkerSkillsCard
                  skillsCatalog={skillsCatalog}
                  savedSkills={savedSkills}
                  draftSkillIds={
                    isEditingDetails
                      ? draftSkillIds
                      : savedSkills.map((s) => s.skillId)
                  }
                  onAddSkill={handleAddSkill}
                  onRemoveSkill={handleRemoveSkill}
                  isEditingDetails={isEditingDetails}
                  isSavingDetails={isSavingDetails}
                  isLoadingSkills={isLoadingSkills}
                  skillsError={skillsError}
                  onRetrySkills={handleRetry}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkerProfile;
