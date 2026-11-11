import React from "react";
import { useAuth } from "@/context";
import { User, Phone, MapPin, FileText } from "lucide-react";

export interface RecruiterPersonalInfoCardProps {
  isEditingDetails?: boolean;
  isSavingDetails?: boolean;
  fullName?: string;
  onChangeFullName?: (value: string) => void;
  phone?: string;
  onChangePhone?: (value: string) => void;
  location?: string;
  onChangeLocation?: (value: string) => void;
  bio?: string;
  onChangeBio?: (value: string) => void;
}

export const RecruiterPersonalInfoCard: React.FC<
  RecruiterPersonalInfoCardProps
> = ({
  isEditingDetails = false,
  isSavingDetails = false,
  fullName: controlledFullName,
  onChangeFullName,
  phone: controlledPhone,
  onChangePhone,
  location: controlledLocation,
  onChangeLocation,
  bio: controlledBio,
  onChangeBio,
}) => {
  const { user } = useAuth();

  const currentSavedName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "";

  const fullName =
    controlledFullName !== undefined ? controlledFullName : currentSavedName;
  const email = user?.email || "—";
  const phone =
    controlledPhone !== undefined ? controlledPhone : user?.phone || "";
  const location =
    controlledLocation !== undefined
      ? controlledLocation
      : user?.location || "";
  const bio = controlledBio !== undefined ? controlledBio : user?.bio || "";

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="recruiter-full-name"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Full Name
          </label>
          {isEditingDetails ? (
            <input
              id="recruiter-full-name"
              type="text"
              value={fullName}
              onChange={(e) => onChangeFullName?.(e.target.value)}
              disabled={isSavingDetails}
              placeholder="e.g. Jane Doe"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
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
          {isEditingDetails ? (
            <input
              id="recruiter-phone"
              type="tel"
              value={phone}
              onChange={(e) => onChangePhone?.(e.target.value)}
              disabled={isSavingDetails}
              placeholder="e.g. +1 555-123-4567"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
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
          {isEditingDetails ? (
            <input
              id="recruiter-location"
              type="text"
              value={location}
              onChange={(e) => onChangeLocation?.(e.target.value)}
              disabled={isSavingDetails}
              placeholder="e.g. San Francisco, CA"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
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
          {isEditingDetails ? (
            <textarea
              id="recruiter-bio"
              rows={3}
              value={bio}
              onChange={(e) => onChangeBio?.(e.target.value)}
              disabled={isSavingDetails}
              placeholder="Introduce yourself, your recruiting focus, and what types of roles you hire for..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
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
