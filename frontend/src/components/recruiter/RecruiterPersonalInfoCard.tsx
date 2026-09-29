import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context";
import {
  updateRecruiterPersonalProfile,
  parseFullName,
  formatNullableField,
} from "@/lib/recruiter-api";
import { User, Phone, MapPin, FileText } from "lucide-react";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const RecruiterPersonalInfoCard: React.FC = () => {
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
      await updateRecruiterPersonalProfile(payload);
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
          msg || "Failed to update personal details. Please try again.",
        );
      } else {
        setPersonalError(
          "Failed to update personal details. Please try again.",
        );
      }
    } finally {
      setIsSavingPersonal(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
      <div className="flex items-start justify-between pb-6 border-b border-slate-100">
        <div className="pr-4">
          <h3 className="text-lg font-bold text-slate-900">
            Personal information
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            A structured overview similar to a professional profile, with
            editable sections for your core details.
          </p>
        </div>

        <div className="shrink-0 pt-1">
          {!isEditingPersonal ? (
            <button
              type="button"
              onClick={handleStartEditingPersonal}
              className="text-sm font-semibold text-[#1877f2] hover:text-[#166fe5] transition-colors cursor-pointer"
              aria-label="Edit Personal Information"
            >
              Update
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelPersonal}
                disabled={isSavingPersonal}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSavePersonal();
                }}
                disabled={isSavingPersonal}
                className="text-sm font-semibold text-[#1877f2] hover:text-[#166fe5] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingPersonal ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {personalError && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {personalError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="recruiter-full-name"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Full Name
          </label>
          {isEditingPersonal ? (
            <input
              id="recruiter-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setCustomFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <User className="w-4 h-4 text-slate-400" />
              <span>{fullName || "—"}</span>
            </div>
          )}
        </div>

        {/* Email Address (Read-only) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="truncate">{email}</span>
            <span className="text-[11px] text-slate-400 shrink-0 font-normal">
              Primary
            </span>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="recruiter-phone"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Phone Number
          </label>
          {isEditingPersonal ? (
            <input
              id="recruiter-phone"
              type="tel"
              value={phone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="e.g. +1 555-123-4567"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{phone || "—"}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="recruiter-location"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Location
          </label>
          {isEditingPersonal ? (
            <input
              id="recruiter-location"
              type="text"
              value={location}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{location || "—"}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="sm:col-span-2">
          <label
            htmlFor="recruiter-bio"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Professional Bio
          </label>
          {isEditingPersonal ? (
            <textarea
              id="recruiter-bio"
              rows={3}
              value={bio}
              onChange={(e) => setCustomBio(e.target.value)}
              placeholder="Introduce yourself, your recruiting focus, and what types of roles you hire for..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
            />
          ) : (
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="whitespace-pre-line leading-relaxed">
                {bio || "No professional biography provided yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
