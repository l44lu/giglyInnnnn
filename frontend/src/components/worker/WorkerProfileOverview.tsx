import React, { useState, useRef, useEffect } from "react";
import { User as UserIcon, Camera, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { validateAvatarFile, fetchWorkerAvatarBlob } from "@/lib/worker-api";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export interface WorkerProfileOverviewProps {
  displayName: string;
  avatarUrl?: string | null;
  avatarVersion?: string | number;
  isUploadingAvatar?: boolean;
  onUploadAvatar?: (file: File) => Promise<void>;
  location?: string | null;
  bio?: string | null;
  headline?: string | null;
  isOpenToWork: boolean;
  isEditingDetails: boolean;
  isSavingDetails: boolean;
  customHeadline: string | null;
  onChangeHeadline: (value: string) => void;
  customIsOpenToWork: boolean | null;
  onToggleIsOpenToWork: () => void;
}

export const WorkerProfileOverview: React.FC<WorkerProfileOverviewProps> = ({
  displayName,
  avatarUrl,
  avatarVersion,
  isUploadingAvatar = false,
  onUploadAvatar,
  location,
  bio,
  headline,
  isOpenToWork,
  isEditingDetails,
  isSavingDetails,
  customHeadline,
  onChangeHeadline,
  customIsOpenToWork,
  onToggleIsOpenToWork,
}) => {
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState<boolean>(false);

  // Ref tracking the object URL currently assigned to <img src>.
  // Used to prevent revoking a URL that React is still rendering.
  const avatarObjectUrlRef = useRef<string | null>(null);

  // Ref tracking the previous object URL that is pending revocation.
  // Revocation is deferred until the NEW image fires onLoad, confirming
  // the browser has decoded and rendered the replacement.
  const previousAvatarObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!avatarUrl || avatarUrl.trim() === "") {
        return;
      }

      // Show loading indicator for this fetch attempt.
      setIsLoadingAvatar(true);

      try {
        const blob = await fetchWorkerAvatarBlob(avatarVersion);
        if (!isMounted) return;

        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          // Store the currently active URL as the pending-revoke URL.
          // It will be revoked in onLoad once the browser confirms the
          // new image has rendered — NOT here in the fetch effect.
          previousAvatarObjectUrlRef.current = avatarObjectUrlRef.current;
          avatarObjectUrlRef.current = newUrl;
          setAvatarObjectUrl(newUrl);
          // isLoadingAvatar cleared in onLoad (confirmed) or stays briefly
          // until the browser decodes the blob URL.
        } else {
          // 404 / no avatar: clear state and show fallback.
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
      // Only cancel the in-flight async operation.
      // Never revoke the currently displayed object URL here — that is
      // handled by onLoad (replacement) and the unmount effect (teardown).
      isMounted = false;
    };
  }, [avatarUrl, avatarVersion]);

  // Final unmount cleanup: release both active and pending-revoke URLs.
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

  // Called once the browser has successfully decoded and painted the avatar.
  // This is the safe moment to revoke the previous object URL, since the
  // replacement image is now confirmed visible.
  const handleAvatarLoad = () => {
    setIsLoadingAvatar(false);
    if (previousAvatarObjectUrlRef.current) {
      URL.revokeObjectURL(previousAvatarObjectUrlRef.current);
      previousAvatarObjectUrlRef.current = null;
    }
  };

  // Called when the browser fails to decode the current blob URL
  // (e.g. the URL was revoked externally or the blob was corrupt).
  // Clears ONLY the specific URL that failed — does not permanently
  // lock the component into an error state.
  const handleAvatarError = (currentUrl: string) => {
    if (avatarObjectUrlRef.current === currentUrl) {
      URL.revokeObjectURL(currentUrl);
      avatarObjectUrlRef.current = null;
      setAvatarObjectUrl(null);
      setIsLoadingAvatar(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      {/* Avatar Container: Displays authenticated avatar or neutral fallback icon with camera upload control */}
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

          {/* Uploading Overlay Spinner */}
          {isUploadingAvatar && (
            <div
              data-testid="avatar-uploading-overlay"
              className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white backdrop-blur-2xs"
            >
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Upload / Camera Trigger Button */}
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
          data-testid="avatar-file-input"
          aria-label="Upload profile avatar"
        />
      </div>

      {/* Identity & Headline */}
      <h2 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
        {displayName}
      </h2>
      {isEditingDetails ? (
        <div className="mt-2">
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
            HEADLINE
          </label>
          <input
            type="text"
            value={customHeadline ?? ""}
            onChange={(e) => onChangeHeadline(e.target.value)}
            placeholder="e.g. Freelance Worker • General labor"
            disabled={isSavingDetails}
            aria-label="Professional headline"
            className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        </div>
      ) : (
        <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 leading-snug">
          {headline || "No headline added yet"}
        </p>
      )}
      <p className="text-xs text-slate-500 mt-1.5">
        {location ? `${location} • Available for gigs` : "Location not set"}
      </p>

      {/* Bio Summary */}
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-4">
        {bio || "No bio provided yet."}
      </p>

      {/* Status Badges / Pills */}
      <div className="flex flex-wrap gap-2 mt-5">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          Verified profile
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          — rating
        </span>
        {isEditingDetails ? (
          <button
            type="button"
            onClick={onToggleIsOpenToWork}
            disabled={isSavingDetails}
            aria-pressed={Boolean(customIsOpenToWork)}
            aria-label="Toggle open to work status"
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              customIsOpenToWork
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 border-slate-200 text-slate-400 line-through hover:bg-slate-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {customIsOpenToWork ? "✓ Open to work" : "✕ Not open to work"}
          </button>
        ) : (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isOpenToWork
                ? "bg-slate-100 text-slate-700"
                : "bg-slate-100 text-slate-400 line-through"
            }`}
          >
            {isOpenToWork ? "Open to work" : "Not open to work"}
          </span>
        )}
      </div>
    </div>
  );
};
