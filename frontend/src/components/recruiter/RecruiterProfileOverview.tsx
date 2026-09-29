import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  Camera,
  Loader2,
  MapPin,
  Briefcase,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  validateAvatarFile,
  fetchRecruiterAvatarBlob,
} from "@/lib/recruiter-api";

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
}) => {
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState<boolean>(false);

  // Ref tracking current and pending revocation URLs
  const avatarObjectUrlRef = useRef<string | null>(null);
  const previousAvatarObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!avatarUrl || avatarUrl.trim() === "") {
        return;
      }

      setIsLoadingAvatar(true);

      try {
        const blob = await fetchRecruiterAvatarBlob(avatarVersion);
        if (!isMounted) return;

        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          previousAvatarObjectUrlRef.current = avatarObjectUrlRef.current;
          avatarObjectUrlRef.current = newUrl;
          setAvatarObjectUrl(newUrl);
        } else {
          setAvatarObjectUrl(null);
          setIsLoadingAvatar(false);
        }
      } catch {
        if (isMounted) {
          setAvatarObjectUrl(null);
          setIsLoadingAvatar(false);
        }
      }
    };

    void loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [avatarUrl, avatarVersion]);

  // Teardown unmount cleanup
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      if (previousAvatarObjectUrlRef.current) {
        URL.revokeObjectURL(previousAvatarObjectUrlRef.current);
        previousAvatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    e.target.value = "";

    const validationError = validateAvatarFile(selectedFile);
    if (validationError) {
      void Toast.fire({
        icon: "error",
        title: validationError,
      });
      return;
    }

    if (onUploadAvatar) {
      void onUploadAvatar(selectedFile);
    }
  };

  const handleAvatarLoad = () => {
    setIsLoadingAvatar(false);
    if (previousAvatarObjectUrlRef.current) {
      URL.revokeObjectURL(previousAvatarObjectUrlRef.current);
      previousAvatarObjectUrlRef.current = null;
    }
  };

  const handleAvatarError = (currentUrl: string) => {
    if (avatarObjectUrlRef.current === currentUrl) {
      URL.revokeObjectURL(currentUrl);
      avatarObjectUrlRef.current = null;
      setAvatarObjectUrl(null);
      setIsLoadingAvatar(false);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      {/* Avatar with upload */}
      <div className="relative w-20 h-20 shrink-0">
        <div
          onClick={handleTriggerUpload}
          className={`w-20 h-20 rounded-full bg-slate-100 ring-4 ring-slate-50 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden relative ${
            isUploadingAvatar ? "cursor-not-allowed" : "cursor-pointer group"
          }`}
          title={
            isUploadingAvatar ? "Uploading avatar..." : "Click to change avatar"
          }
        >
          {avatarObjectUrl ? (
            <img
              src={avatarObjectUrl}
              alt={displayName}
              onLoad={handleAvatarLoad}
              onError={() => handleAvatarError(avatarObjectUrl)}
              className="w-full h-full object-cover"
            />
          ) : isLoadingAvatar ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          ) : (
            <UserIcon className="w-10 h-10 text-slate-400" />
          )}

          {/* Uploading Overlay */}
          {isUploadingAvatar && (
            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white backdrop-blur-2xs">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Camera Upload Button */}
        <button
          type="button"
          onClick={handleTriggerUpload}
          disabled={isUploadingAvatar}
          aria-label={
            isUploadingAvatar ? "Uploading avatar..." : "Upload profile avatar"
          }
          className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white shadow-md ring-2 ring-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/50"
        >
          {isUploadingAvatar ? (
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
          disabled={isUploadingAvatar}
          className="hidden"
          aria-label="Avatar file input"
        />
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
