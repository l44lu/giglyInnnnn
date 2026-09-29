import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  getRecruiterProfile,
  updateRecruiterProfile,
  parseIntegerOrNull,
  uploadRecruiterAvatar,
  getAvatarVersion,
  setAvatarVersion,
} from "@/lib/recruiter-api";
import type { UpdateRecruiterProfilePayload } from "@/types/recruiter-profile";
import type { RecruiterProfileResponse } from "@/types/recruiter-profile";
import {
  RecruiterSidebar,
  RecruiterProfileHeader,
  RecruiterProfileOverview,
  RecruiterPersonalInfoCard,
  RecruiterProfessionalCard,
  RecruiterChangePasswordCard,
  RecruiterCompanyCard,
} from "@/components/recruiter";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  iconColor: "#1877f2",
});

const defaultProfileValues: RecruiterProfileResponse = {
  id: "",
  userId: "",
  companyId: null,
  roleTitle: "",
  yearsExperience: null,
  createdAt: "",
  updatedAt: "",
};

export const RecruiterProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersionState] = useState<number | undefined>(
    () => getAvatarVersion(),
  );

  // Profile data states
  const [profile, setProfile] = useState<RecruiterProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const activeProfile = profile ?? defaultProfileValues;

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [customRoleTitle, setCustomRoleTitle] = useState<string | null>(null);
  const [customYearsExperience, setCustomYearsExperience] = useState<
    string | null
  >(null);

  const displayName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "Recruiter";

  const handleStartEditingDetails = () => {
    if (isLoadingProfile) return;
    setCustomRoleTitle(activeProfile.roleTitle ?? "");
    setCustomYearsExperience(
      activeProfile.yearsExperience !== null &&
        activeProfile.yearsExperience !== undefined
        ? activeProfile.yearsExperience.toString()
        : "",
    );
    setDetailsError(null);
    setIsEditingDetails(true);
  };

  const handleCancelDetails = () => {
    setCustomRoleTitle(null);
    setCustomYearsExperience(null);
    setDetailsError(null);
    setIsEditingDetails(false);
  };

  const handleSaveDetails = async () => {
    if (isSavingDetails) return;
    const rawRoleTitle = customRoleTitle ?? activeProfile.roleTitle ?? "";
    const trimmedRoleTitle = rawRoleTitle.trim();
    const roleTitlePayload =
      trimmedRoleTitle.length > 0 ? trimmedRoleTitle : null;

    const rawYearsExp =
      customYearsExperience ??
      (activeProfile.yearsExperience !== null &&
      activeProfile.yearsExperience !== undefined
        ? activeProfile.yearsExperience.toString()
        : "");
    const parsedYearsExp = parseIntegerOrNull(rawYearsExp);
    if (Number.isNaN(parsedYearsExp)) {
      setDetailsError(
        "Years of experience must be a non-negative whole number.",
      );
      return;
    }

    const payload: UpdateRecruiterProfilePayload = {
      roleTitle: roleTitlePayload,
      yearsExperience: parsedYearsExp,
    };

    setIsSavingDetails(true);
    setDetailsError(null);

    try {
      const updatedProfile = await updateRecruiterProfile(payload);
      setProfile(updatedProfile);
      setCustomRoleTitle(null);
      setCustomYearsExperience(null);
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
      await uploadRecruiterAvatar(file);
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

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const data = await getRecruiterProfile();
        if (!isMounted) return;
        setProfile(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        if (axios.isAxiosError(err)) {
          setProfileError(
            err.response?.status === 401
              ? "Session expired. Please log in again."
              : "Unable to load profile data from the server. Please try again.",
          );
        } else {
          setProfileError(
            "An unexpected error occurred while loading profile data.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased">
      {/* Sidebar with activeTab="profile" */}
      <RecruiterSidebar activeTab="profile" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <RecruiterProfileHeader
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
          onRetryProfile={() => setRetryCount((prev) => prev + 1)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Left Column - Overview */}
          <div className="lg:col-span-5 xl:col-span-4">
            <RecruiterProfileOverview
              displayName={displayName}
              avatarUrl={user?.avatarUrl}
              avatarVersion={avatarVersion}
              isUploadingAvatar={isUploadingAvatar}
              onUploadAvatar={handleUploadAvatar}
              location={user?.location}
              bio={user?.bio}
              roleTitle={activeProfile.roleTitle}
              yearsExperience={activeProfile.yearsExperience}
            />
          </div>

          {/* Right Column - Personal Info & Password */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <RecruiterPersonalInfoCard />
            <RecruiterChangePasswordCard />
          </div>
        </div>

        {/* Full Width Sections Below Grid */}
        <div className="mt-8 space-y-8">
          <RecruiterProfessionalCard
            profile={profile}
            isEditingDetails={isEditingDetails}
            isSavingDetails={isSavingDetails}
            customRoleTitle={customRoleTitle}
            onChangeRoleTitle={setCustomRoleTitle}
            customYearsExperience={customYearsExperience}
            onChangeYearsExperience={setCustomYearsExperience}
          />
          <RecruiterCompanyCard />
        </div>
      </main>
    </div>
  );
};

export default RecruiterProfile;
