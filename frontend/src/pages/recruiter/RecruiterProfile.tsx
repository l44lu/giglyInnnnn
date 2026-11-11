import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  getRecruiterProfile,
  updateRecruiterProfile,
  updateRecruiterPersonalProfile,
  getRecruiterCompany,
  updateRecruiterCompany,
  parseFullName,
  formatNullableField,
  parseIntegerOrNull,
  uploadRecruiterAvatar,
  removeRecruiterAvatar,
  uploadRecruiterCompanyLogo,
  removeRecruiterCompanyLogo,
  getAvatarVersion,
  setAvatarVersion,
  getLogoVersion,
  setLogoVersion,
} from "@/lib/recruiter-api";
import type {
  UpdateRecruiterProfilePayload,
  RecruiterProfileResponse,
  Company,
  UpdateCompanyPayload,
  UpdateRecruiterPersonalProfilePayload,
} from "@/types/recruiter-profile";
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
  const [isRemovingProfileImage, setIsRemovingProfileImage] = useState(false);
  const [avatarVersion, setAvatarVersionState] = useState<number | undefined>(
    () => getAvatarVersion(),
  );
  const [logoVersion, setLogoVersionState] = useState<number | undefined>(() =>
    getLogoVersion(),
  );

  // Synchronize avatar and logo version updates across components
  useEffect(() => {
    const handleAvatarVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setAvatarVersionState(customEvent.detail);
    };
    const handleLogoVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLogoVersionState(customEvent.detail);
    };
    window.addEventListener(
      "gigly:recruiter-avatar-version-updated",
      handleAvatarVersionUpdate,
    );
    window.addEventListener(
      "gigly:recruiter-company-logo-version-updated",
      handleLogoVersionUpdate,
    );
    return () => {
      window.removeEventListener(
        "gigly:recruiter-avatar-version-updated",
        handleAvatarVersionUpdate,
      );
      window.removeEventListener(
        "gigly:recruiter-company-logo-version-updated",
        handleLogoVersionUpdate,
      );
    };
  }, []);

  // Profile and Company data states (saved baseline)
  const [profile, setProfile] = useState<RecruiterProfileResponse | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

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
  const [customRoleTitle, setCustomRoleTitle] = useState<string>("");
  const [customYearsExperience, setCustomYearsExperience] =
    useState<string>("");

  // Company Details Drafts
  const [customCompanyName, setCustomCompanyName] = useState<string>("");
  const [customCompanyIndustry, setCustomCompanyIndustry] =
    useState<string>("");
  const [customCompanySize, setCustomCompanySize] = useState<string>("");
  const [customCompanyWebsite, setCustomCompanyWebsite] = useState<string>("");
  const [customCompanyHeadquarters, setCustomCompanyHeadquarters] =
    useState<string>("");
  const [customCompanyAbout, setCustomCompanyAbout] = useState<string>("");

  const currentSavedName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "";

  const displayName = currentSavedName || "Recruiter";

  // Unified edit start: populate drafts from current saved baselines
  const handleStartEditingDetails = () => {
    if (isLoadingProfile) return;

    // Personal baselines
    setCustomFullName(currentSavedName);
    setCustomPhone(user?.phone ?? "");
    setCustomLocation(user?.location ?? "");
    setCustomBio(user?.bio ?? "");

    // Professional baselines
    setCustomRoleTitle(activeProfile.roleTitle ?? "");
    setCustomYearsExperience(
      activeProfile.yearsExperience !== null &&
        activeProfile.yearsExperience !== undefined
        ? activeProfile.yearsExperience.toString()
        : "",
    );

    // Company baselines
    setCustomCompanyName(company?.name ?? "");
    setCustomCompanyIndustry(company?.industry ?? "");
    setCustomCompanySize(company?.companySize ?? "");
    setCustomCompanyWebsite(company?.website ?? "");
    setCustomCompanyHeadquarters(company?.headquartersLocation ?? "");
    setCustomCompanyAbout(company?.about ?? "");

    setDetailsError(null);
    setIsEditingDetails(true);
  };

  // Unified cancel: discard unsaved edits, restore from latest accepted baselines
  const handleCancelDetails = () => {
    setCustomFullName(currentSavedName);
    setCustomPhone(user?.phone ?? "");
    setCustomLocation(user?.location ?? "");
    setCustomBio(user?.bio ?? "");

    setCustomRoleTitle(activeProfile.roleTitle ?? "");
    setCustomYearsExperience(
      activeProfile.yearsExperience !== null &&
        activeProfile.yearsExperience !== undefined
        ? activeProfile.yearsExperience.toString()
        : "",
    );

    setCustomCompanyName(company?.name ?? "");
    setCustomCompanyIndustry(company?.industry ?? "");
    setCustomCompanySize(company?.companySize ?? "");
    setCustomCompanyWebsite(company?.website ?? "");
    setCustomCompanyHeadquarters(company?.headquartersLocation ?? "");
    setCustomCompanyAbout(company?.about ?? "");

    setDetailsError(null);
    setIsEditingDetails(false);
  };

  // Unified save coordinator
  const handleSaveDetails = async () => {
    if (isSavingDetails) return;

    // --- Saved baselines ---
    const savedName = currentSavedName.trim();
    const savedPhone = (user?.phone ?? "").trim();
    const savedLocation = (user?.location ?? "").trim();
    const savedBio = (user?.bio ?? "").trim();

    const savedRoleTitle = (activeProfile.roleTitle ?? "").trim();
    const savedYearsExp =
      activeProfile.yearsExperience !== null &&
      activeProfile.yearsExperience !== undefined
        ? activeProfile.yearsExperience.toString().trim()
        : "";

    const savedCompName = (company?.name ?? "").trim();
    const savedCompIndustry = (company?.industry ?? "").trim();
    const savedCompSize = (company?.companySize ?? "").trim();
    const savedCompWebsite = (company?.website ?? "").trim();
    const savedCompHq = (company?.headquartersLocation ?? "").trim();
    const savedCompAbout = (company?.about ?? "").trim();

    // --- Draft values ---
    const draftFullName = customFullName.trim();
    const draftPhone = customPhone.trim();
    const draftLocation = customLocation.trim();
    const draftBio = customBio.trim();

    const draftRoleTitle = customRoleTitle.trim();
    const draftYearsExp = customYearsExperience.trim();

    const draftCompName = customCompanyName.trim();
    const draftCompIndustry = customCompanyIndustry.trim();
    const draftCompSize = customCompanySize.trim();
    const draftCompWebsite = customCompanyWebsite.trim();
    const draftCompHq = customCompanyHeadquarters.trim();
    const draftCompAbout = customCompanyAbout.trim();

    // --- Dirty checking per section ---
    const isPersonalDirty =
      draftFullName !== savedName ||
      draftPhone !== savedPhone ||
      draftLocation !== savedLocation ||
      draftBio !== savedBio;

    const isProfessionalDirty =
      draftRoleTitle !== savedRoleTitle || draftYearsExp !== savedYearsExp;

    const hasAnyCompDraftEntered =
      draftCompName.length > 0 ||
      draftCompIndustry.length > 0 ||
      draftCompSize.length > 0 ||
      draftCompWebsite.length > 0 ||
      draftCompHq.length > 0 ||
      draftCompAbout.length > 0;

    const isCompanyDirty =
      draftCompName !== savedCompName ||
      draftCompIndustry !== savedCompIndustry ||
      draftCompSize !== savedCompSize ||
      draftCompWebsite !== savedCompWebsite ||
      draftCompHq !== savedCompHq ||
      draftCompAbout !== savedCompAbout;

    // --- Preflight Validation ---
    if (isPersonalDirty && draftFullName.length === 0) {
      setDetailsError("Full name is required.");
      return;
    }

    const parsedYearsExp = parseIntegerOrNull(draftYearsExp);
    if (isProfessionalDirty && Number.isNaN(parsedYearsExp)) {
      setDetailsError(
        "Years of experience must be a non-negative whole number.",
      );
      return;
    }

    if (
      isCompanyDirty &&
      (company !== null || hasAnyCompDraftEntered) &&
      draftCompName.length === 0
    ) {
      setDetailsError("Company name is required.");
      return;
    }

    // --- No changes to save ---
    if (!isPersonalDirty && !isProfessionalDirty && !isCompanyDirty) {
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
      id: "personal" | "professional" | "company";
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
          const payload: UpdateRecruiterPersonalProfilePayload = {
            firstName,
            lastName,
            phone: formatNullableField(customPhone),
            location: formatNullableField(customLocation),
            bio: formatNullableField(customBio),
          };
          await updateRecruiterPersonalProfile(payload);
          await refreshUser();
        },
      });
    }

    if (isProfessionalDirty) {
      tasks.push({
        id: "professional",
        displayName: "Professional Details",
        execute: async () => {
          const payload: UpdateRecruiterProfilePayload = {
            roleTitle: draftRoleTitle.length > 0 ? draftRoleTitle : null,
            yearsExperience: parsedYearsExp,
          };
          const updated = await updateRecruiterProfile(payload);
          setProfile(updated);
        },
      });
    }

    if (isCompanyDirty) {
      tasks.push({
        id: "company",
        displayName: "Company Details",
        execute: async () => {
          const payload: UpdateCompanyPayload = {
            name: draftCompName,
            industry: formatNullableField(customCompanyIndustry),
            companySize: formatNullableField(customCompanySize),
            website: formatNullableField(customCompanyWebsite),
            headquartersLocation: formatNullableField(
              customCompanyHeadquarters,
            ),
            about: formatNullableField(customCompanyAbout),
          };
          const updated = await updateRecruiterCompany(payload);
          setCompany(updated);
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

  const hasLinkedCompany = Boolean(
    !isLoadingProfile &&
    !profileError &&
    company &&
    (company.id || profile?.companyId),
  );

  const handleUploadProfileImage = async (file: File): Promise<void> => {
    if (isLoadingProfile || profileError) return;
    if (isUploadingAvatar) return;

    setIsUploadingAvatar(true);
    try {
      if (hasLinkedCompany) {
        const res = await uploadRecruiterCompanyLogo(file);
        if (company) {
          const updatedCompany = { ...company, logoUrl: res.logoUrl };
          setCompany(updatedCompany);
        }
        const newVersion = Date.now();
        setLogoVersion(newVersion);
        setLogoVersionState(newVersion);
        void Toast.fire({
          icon: "success",
          title: "Company logo updated successfully",
        });
      } else {
        await uploadRecruiterAvatar(file);
        await refreshUser();
        const newVersion = Date.now();
        setAvatarVersion(newVersion);
        setAvatarVersionState(newVersion);
        void Toast.fire({
          icon: "success",
          title: "Avatar updated successfully",
        });
      }
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
          title:
            msg ||
            (hasLinkedCompany
              ? "Failed to upload company logo. Please try again."
              : "Failed to upload avatar. Please try again."),
        });
      } else {
        void Toast.fire({
          icon: "error",
          title: hasLinkedCompany
            ? "Failed to upload company logo. Please try again."
            : "Failed to upload avatar. Please try again.",
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveProfileImage = async (): Promise<void> => {
    if (isLoadingProfile || profileError) return;
    if (isRemovingProfileImage) return;

    setIsRemovingProfileImage(true);
    try {
      if (hasLinkedCompany) {
        await removeRecruiterCompanyLogo();
        if (company) {
          setCompany({ ...company, logoUrl: null });
        }
        const newVersion = Date.now();
        setLogoVersion(newVersion);
        setLogoVersionState(newVersion);
        void Toast.fire({
          icon: "success",
          title: "Company logo removed successfully",
        });
      } else {
        await removeRecruiterAvatar();
        try {
          await refreshUser();
        } catch {
          // Refresh failure must not restore or retain the stale avatar
        }
        const newVersion = Date.now();
        setAvatarVersion(newVersion);
        setAvatarVersionState(newVersion);
        void Toast.fire({
          icon: "success",
          title: "Avatar removed successfully",
        });
      }
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
          title:
            msg ||
            (hasLinkedCompany
              ? "Failed to remove company logo. Please try again."
              : "Failed to remove avatar. Please try again."),
        });
      } else {
        void Toast.fire({
          icon: "error",
          title: hasLinkedCompany
            ? "Failed to remove company logo. Please try again."
            : "Failed to remove avatar. Please try again.",
        });
      }
      throw err;
    } finally {
      setIsRemovingProfileImage(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const [profileData, companyData] = await Promise.all([
          getRecruiterProfile(),
          getRecruiterCompany(),
        ]);
        if (!isMounted) return;
        setProfile(profileData);
        setCompany(companyData);
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

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased">
      {/* Sidebar with activeTab="profile" */}
      <RecruiterSidebar activeTab="profile" company={company} />

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
              company={company}
              hasCompany={hasLinkedCompany}
              isLoadingCompany={isLoadingProfile}
              companyError={profileError}
              logoVersion={logoVersion}
              isUploadingAvatar={isUploadingAvatar}
              onUploadAvatar={handleUploadProfileImage}
              isRemovingPhoto={isRemovingProfileImage}
              onRemovePhoto={handleRemoveProfileImage}
              location={user?.location}
              bio={user?.bio}
              roleTitle={activeProfile.roleTitle}
              yearsExperience={activeProfile.yearsExperience}
            />
          </div>

          {/* Right Column - Personal Info & Password */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <RecruiterPersonalInfoCard
              isEditingDetails={isEditingDetails}
              isSavingDetails={isSavingDetails}
              fullName={isEditingDetails ? customFullName : currentSavedName}
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
            <RecruiterChangePasswordCard />
          </div>
        </div>

        {/* Full Width Sections Below Grid */}
        <div className="mt-8 space-y-8">
          <RecruiterProfessionalCard
            profile={profile}
            isEditingDetails={isEditingDetails}
            isSavingDetails={isSavingDetails}
            customRoleTitle={
              isEditingDetails
                ? customRoleTitle
                : (activeProfile.roleTitle ?? "")
            }
            onChangeRoleTitle={setCustomRoleTitle}
            customYearsExperience={
              isEditingDetails
                ? customYearsExperience
                : activeProfile.yearsExperience !== null &&
                    activeProfile.yearsExperience !== undefined
                  ? activeProfile.yearsExperience.toString()
                  : ""
            }
            onChangeYearsExperience={setCustomYearsExperience}
          />
          <RecruiterCompanyCard
            company={company}
            isEditingDetails={isEditingDetails}
            isSavingDetails={isSavingDetails}
            name={isEditingDetails ? customCompanyName : (company?.name ?? "")}
            onChangeName={setCustomCompanyName}
            industry={
              isEditingDetails
                ? customCompanyIndustry
                : (company?.industry ?? "")
            }
            onChangeIndustry={setCustomCompanyIndustry}
            companySize={
              isEditingDetails
                ? customCompanySize
                : (company?.companySize ?? "")
            }
            onChangeCompanySize={setCustomCompanySize}
            website={
              isEditingDetails ? customCompanyWebsite : (company?.website ?? "")
            }
            onChangeWebsite={setCustomCompanyWebsite}
            headquartersLocation={
              isEditingDetails
                ? customCompanyHeadquarters
                : (company?.headquartersLocation ?? "")
            }
            onChangeHeadquartersLocation={setCustomCompanyHeadquarters}
            about={
              isEditingDetails ? customCompanyAbout : (company?.about ?? "")
            }
            onChangeAbout={setCustomCompanyAbout}
            onTriggerEdit={handleStartEditingDetails}
            onCompanyChange={setCompany}
          />
        </div>
      </main>
    </div>
  );
};

export default RecruiterProfile;
