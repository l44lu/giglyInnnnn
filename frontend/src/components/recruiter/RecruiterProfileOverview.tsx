import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  Building2,
  Camera,
  Loader2,
  MapPin,
  Briefcase,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  validateAvatarFile,
  validateLogoFile,
  fetchRecruiterAvatarBlob,
  fetchRecruiterCompanyLogoBlob,
  removeRecruiterAvatar,
  removeRecruiterCompanyLogo,
  getAvatarVersion,
  getLogoVersion,
} from "@/lib/recruiter-api";
import type { Company } from "@/types/recruiter-profile";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  iconColor: "#1877f2",
});

export interface RecruiterProfileOverviewProps {
  displayName: string;
  avatarUrl?: string | null;
  avatarVersion?: string | number;
  isUploadingAvatar?: boolean;
  onUploadAvatar?: (file: File) => Promise<void>;
  location?: string | null;
  bio?: string | null;
  roleTitle?: string | null;
  yearsExperience?: number | null;

  // Step 4C: Company and unified profile-image management
  company?: Company | null;
  hasCompany?: boolean;
  isLoadingCompany?: boolean;
  companyError?: string | null;
  logoVersion?: string | number;
  isRemovingPhoto?: boolean;
  onRemovePhoto?: () => Promise<void>;

  // Convenience aliases for unified naming
  isUploadingImage?: boolean;
  onUploadImage?: (file: File) => Promise<void>;
  isRemovingAvatar?: boolean;
  onRemoveAvatar?: () => Promise<void>;
}

export const RecruiterProfileOverview: React.FC<
  RecruiterProfileOverviewProps
> = ({
  displayName,
  avatarUrl,
  avatarVersion,
  isUploadingAvatar = false,
  onUploadAvatar,
  location,
  bio,
  roleTitle,
  yearsExperience,
  company,
  hasCompany,
  isLoadingCompany = false,
  companyError = null,
  logoVersion,
  isRemovingPhoto = false,
  onRemovePhoto,
  isUploadingImage,
  onUploadImage,
  isRemovingAvatar,
  onRemoveAvatar,
}) => {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [localIsRemoving, setLocalIsRemoving] = useState<boolean>(false);
  const [removedImageUrl, setRemovedImageUrl] = useState<string | null>(null);

  const [localAvatarVersion, setLocalAvatarVersion] = useState<
    number | undefined
  >(() => getAvatarVersion());
  const [localLogoVersion, setLocalLogoVersion] = useState<number | undefined>(
    () => getLogoVersion(),
  );

  // Sync image versions across components via window custom events
  useEffect(() => {
    const handleAvatarVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLocalAvatarVersion(customEvent.detail);
    };
    const handleLogoVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLocalLogoVersion(customEvent.detail);
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

  const imageObjectUrlRef = useRef<string | null>(null);
  const previousImageObjectUrlRef = useRef<string | null>(null);
  const imageFetchIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine effective company association
  const effectiveHasCompany =
    hasCompany !== undefined
      ? hasCompany
      : Boolean(company && (company.id || company.name));

  const activeImageUrl = effectiveHasCompany ? company?.logoUrl : avatarUrl;
  const effectiveVersion = effectiveHasCompany
    ? logoVersion !== undefined
      ? logoVersion
      : localLogoVersion
    : avatarVersion !== undefined
      ? avatarVersion
      : localAvatarVersion;

  const isUploading = isUploadingImage ?? isUploadingAvatar;
  const onUpload = onUploadImage ?? onUploadAvatar;
  const removing =
    Boolean(isRemovingPhoto || isRemovingAvatar) || localIsRemoving;
  const onRemove = onRemovePhoto ?? onRemoveAvatar;

  const isRemoved =
    removedImageUrl !== null && removedImageUrl === (activeImageUrl ?? "");
  const hasSavedImage =
    !isRemoved &&
    !isLoadingCompany &&
    !companyError &&
    Boolean(activeImageUrl && activeImageUrl.trim() !== "");

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (isLoadingCompany) {
        setIsLoadingImage(true);
        return;
      }

      if (companyError) {
        setImageObjectUrl(null);
        setIsLoadingImage(false);
        return;
      }

      if (isRemoved || !activeImageUrl || activeImageUrl.trim() === "") {
        setImageObjectUrl(null);
        setIsLoadingImage(false);
        return;
      }

      setIsLoadingImage(true);
      const fetchId = ++imageFetchIdRef.current;

      try {
        const blob = effectiveHasCompany
          ? await fetchRecruiterCompanyLogoBlob(effectiveVersion)
          : await fetchRecruiterAvatarBlob(effectiveVersion);

        if (!isMounted || fetchId !== imageFetchIdRef.current) return;

        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          previousImageObjectUrlRef.current = imageObjectUrlRef.current;
          imageObjectUrlRef.current = newUrl;
          setImageObjectUrl(newUrl);
        } else {
          setImageObjectUrl(null);
          setIsLoadingImage(false);
        }
      } catch {
        if (isMounted && fetchId === imageFetchIdRef.current) {
          setImageObjectUrl(null);
          setIsLoadingImage(false);
        }
      }
    };

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [
    effectiveHasCompany,
    activeImageUrl,
    effectiveVersion,
    isLoadingCompany,
    companyError,
    isRemoved,
  ]);

  // Teardown unmount cleanup
  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      if (previousImageObjectUrlRef.current) {
        URL.revokeObjectURL(previousImageObjectUrlRef.current);
        previousImageObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleTriggerUpload = () => {
    if (isUploading || removing || isLoadingCompany || Boolean(companyError)) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    e.target.value = "";

    const validationError = effectiveHasCompany
      ? validateLogoFile(selectedFile)
      : validateAvatarFile(selectedFile);

    if (validationError) {
      void Toast.fire({
        icon: "error",
        title: validationError,
      });
      return;
    }

    if (onUpload) {
      void onUpload(selectedFile);
    }
  };

  const handleRemovePhotoClick = async () => {
    if (removing || isUploading || isLoadingCompany || Boolean(companyError)) {
      return;
    }

    const title = effectiveHasCompany
      ? "Remove company logo?"
      : "Remove profile photo?";
    const text = effectiveHasCompany
      ? "Removing the company logo will restore the default icon and affects the shared company image for all recruiters associated with this company."
      : "Removing your photo will restore the default avatar.";
    const confirmButtonText = effectiveHasCompany
      ? "Yes, remove logo"
      : "Yes, remove photo";

    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText,
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setLocalIsRemoving(true);
      if (onRemove) {
        await onRemove();
      } else if (effectiveHasCompany) {
        await removeRecruiterCompanyLogo();
      } else {
        await removeRecruiterAvatar();
      }

      setRemovedImageUrl(activeImageUrl ?? "");
      imageFetchIdRef.current++;
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      if (previousImageObjectUrlRef.current) {
        URL.revokeObjectURL(previousImageObjectUrlRef.current);
        previousImageObjectUrlRef.current = null;
      }
      setImageObjectUrl(null);
      setIsLoadingImage(false);
    } catch {
      // Kept visible on failure; caller/handler handles error feedback
    } finally {
      setLocalIsRemoving(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoadingImage(false);
    if (previousImageObjectUrlRef.current) {
      URL.revokeObjectURL(previousImageObjectUrlRef.current);
      previousImageObjectUrlRef.current = null;
    }
  };

  const handleImageError = (currentUrl: string) => {
    if (imageObjectUrlRef.current === currentUrl) {
      URL.revokeObjectURL(currentUrl);
      imageObjectUrlRef.current = null;
      setImageObjectUrl(null);
      setIsLoadingImage(false);
    }
  };

  // Build role subtitle line
  const roleParts: string[] = [];
  if (roleTitle) {
    roleParts.push(roleTitle);
  }
  if (yearsExperience !== null && yearsExperience !== undefined) {
    roleParts.push(
      `${yearsExperience} ${yearsExperience === 1 ? "year" : "years"} experience`,
    );
  }
  const roleSubtitle = roleParts.length > 0 ? roleParts.join(" • ") : null;

  const imageAltText = effectiveHasCompany
    ? company?.name
      ? `${company.name} logo`
      : "Company logo"
    : displayName;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      {/* Profile Image with upload & remove controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <div
            onClick={handleTriggerUpload}
            className={`w-20 h-20 rounded-full bg-slate-100 ring-4 ring-slate-50 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden relative ${
              isUploading ||
              removing ||
              isLoadingCompany ||
              Boolean(companyError)
                ? "cursor-not-allowed"
                : "cursor-pointer group"
            }`}
            title={
              isLoadingCompany
                ? "Loading company..."
                : isUploading
                  ? effectiveHasCompany
                    ? "Uploading logo..."
                    : "Uploading avatar..."
                  : removing
                    ? effectiveHasCompany
                      ? "Removing logo..."
                      : "Removing photo..."
                    : effectiveHasCompany
                      ? "Click to change company logo"
                      : "Click to change avatar"
            }
          >
            {imageObjectUrl ? (
              <img
                src={imageObjectUrl}
                alt={imageAltText}
                onLoad={handleImageLoad}
                onError={() => handleImageError(imageObjectUrl)}
                className="w-full h-full object-cover"
              />
            ) : isLoadingImage || isLoadingCompany ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : effectiveHasCompany ? (
              <Building2 className="w-10 h-10 text-slate-400" />
            ) : (
              <UserIcon className="w-10 h-10 text-slate-400" />
            )}

            {/* Uploading Overlay */}
            {isUploading && (
              <div
                data-testid="profile-image-uploading-overlay"
                className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white backdrop-blur-2xs"
              >
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Camera Upload Button */}
          <button
            type="button"
            onClick={handleTriggerUpload}
            disabled={
              isUploading ||
              removing ||
              isLoadingCompany ||
              Boolean(companyError)
            }
            aria-label={
              isLoadingCompany
                ? "Loading company..."
                : isUploading
                  ? effectiveHasCompany
                    ? "Uploading logo..."
                    : "Uploading avatar..."
                  : effectiveHasCompany
                    ? "Upload company logo"
                    : "Upload profile avatar"
            }
            title={
              effectiveHasCompany
                ? "Upload company logo (JPEG, PNG, WebP up to 2MB)"
                : "Upload avatar (JPEG, PNG, WebP up to 2MB)"
            }
            className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white shadow-md ring-2 ring-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={
              isUploading ||
              removing ||
              isLoadingCompany ||
              Boolean(companyError)
            }
            className="hidden"
            data-testid="profile-image-file-input"
            aria-label={
              effectiveHasCompany
                ? "Company logo file input"
                : "Avatar file input"
            }
          />
        </div>

        {/* Remove Photo / Logo Action: Only shown when a saved image exists */}
        {hasSavedImage && (
          <button
            type="button"
            data-testid="remove-profile-image-button"
            onClick={() => {
              void handleRemovePhotoClick();
            }}
            disabled={
              removing ||
              isUploading ||
              isLoadingCompany ||
              Boolean(companyError)
            }
            aria-label={
              removing
                ? effectiveHasCompany
                  ? "Removing logo..."
                  : "Removing photo..."
                : effectiveHasCompany
                  ? "Remove company logo"
                  : "Remove profile photo"
            }
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {removing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <span>
                {effectiveHasCompany ? "Remove Logo" : "Remove Photo"}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Name */}
      <h2 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
        {displayName}
      </h2>

      {/* Role subtitle */}
      {roleSubtitle ? (
        <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 leading-snug flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {roleSubtitle}
        </p>
      ) : (
        <p className="text-xs sm:text-sm text-slate-400 italic mt-1">
          No role title specified
        </p>
      )}

      {/* Location */}
      {location && (
        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          {location}
        </p>
      )}

      {/* Bio */}
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-4">
        {bio || "No bio provided yet."}
      </p>
    </div>
  );
};
