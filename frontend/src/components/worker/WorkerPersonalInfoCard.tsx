import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  updateWorkerPersonalProfile,
  parseFullName,
  formatNullableField,
} from "@/lib/worker-api";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const WorkerPersonalInfoCard: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [customFullName, setCustomFullName] = useState<string | null>(null);
  const [customPhone, setCustomPhone] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState<string | null>(null);
  const [customBio, setCustomBio] = useState<string | null>(null);

  const currentSavedName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "";

  const fullName = isEditingPersonal
    ? (customFullName ?? "")
    : currentSavedName;
  const email = user?.email || "—";
  const phone = isEditingPersonal ? (customPhone ?? "") : user?.phone || "";
  const location = isEditingPersonal
    ? (customLocation ?? "")
    : user?.location || "";
  const bio = isEditingPersonal ? (customBio ?? "") : user?.bio || "";

  const handleStartEditingPersonal = () => {
    setCustomFullName(currentSavedName);
    setCustomPhone(user?.phone ?? "");
    setCustomLocation(user?.location ?? "");
    setCustomBio(user?.bio ?? "");
    setPersonalError(null);
    setIsEditingPersonal(true);
  };

  const handleCancelPersonal = () => {
    setCustomFullName(null);
    setCustomPhone(null);
    setCustomLocation(null);
    setCustomBio(null);
    setPersonalError(null);
    setIsEditingPersonal(false);
  };

  const handleSavePersonal = async () => {
    if (isSavingPersonal) return;
    const rawName = customFullName ?? fullName;
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      setPersonalError("Full name is required.");
      return;
    }

    const { firstName, lastName } = parseFullName(trimmedName);
    const rawPhone = customPhone ?? (user?.phone || "");
    const rawLocation = customLocation ?? (user?.location || "");
    const rawBio = customBio ?? (user?.bio || "");

    const payload = {
      firstName,
      lastName,
      phone: formatNullableField(rawPhone),
      location: formatNullableField(rawLocation),
      bio: formatNullableField(rawBio),
    };

    setIsSavingPersonal(true);
    setPersonalError(null);

    try {
      await updateWorkerPersonalProfile(payload);
      await refreshUser();
      setCustomFullName(null);
      setCustomPhone(null);
      setCustomLocation(null);
      setCustomBio(null);
      setIsEditingPersonal(false);
      void Toast.fire({
        icon: "success",
        title: "Personal information updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        setPersonalError(
          msg || "Failed to update personal information. Please try again.",
        );
      } else {
        setPersonalError(
          "Failed to update personal information. Please try again.",
        );
      }
    } finally {
      setIsSavingPersonal(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Personal information
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            A structured overview similar to a professional profile, with
            editable sections for your core details.
          </p>
        </div>
        {!isEditingPersonal ? (
          <button
            type="button"
            onClick={handleStartEditingPersonal}
            className="text-sm font-semibold text-[#1877f2] hover:text-[#166fe5] transition-colors cursor-pointer"
            aria-label="Update personal information"
          >
            Update
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelPersonal}
              disabled={isSavingPersonal}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              aria-label="Cancel personal information editing"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSavePersonal();
              }}
              disabled={isSavingPersonal}
              className="text-xs sm:text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="Save personal information"
            >
              {isSavingPersonal ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {personalError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
        >
          <span>{personalError}</span>
          <button
            type="button"
            onClick={() => setPersonalError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-semibold ml-3 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setCustomFullName(e.target.value)}
              placeholder="Full name"
              readOnly={!isEditingPersonal}
              disabled={isSavingPersonal}
              className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden cursor-default"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              PHONE
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="—"
              readOnly={!isEditingPersonal}
              disabled={isSavingPersonal}
              className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              LOCATION
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="—"
              readOnly={!isEditingPersonal}
              disabled={isSavingPersonal}
              className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
            BIO
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setCustomBio(e.target.value)}
            placeholder="No bio provided yet."
            readOnly={!isEditingPersonal}
            disabled={isSavingPersonal}
            className="w-full bg-white border border-slate-200/90 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};
