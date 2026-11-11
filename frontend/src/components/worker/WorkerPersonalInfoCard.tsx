import React from "react";
import { useAuth } from "@/context";

export interface WorkerPersonalInfoCardProps {
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

export const WorkerPersonalInfoCard: React.FC<WorkerPersonalInfoCardProps> = ({
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
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => onChangeFullName?.(e.target.value)}
              placeholder="Full name"
              readOnly={!isEditingDetails}
              disabled={isSavingDetails}
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
              onChange={(e) => onChangePhone?.(e.target.value)}
              placeholder="—"
              readOnly={!isEditingDetails}
              disabled={isSavingDetails}
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
              onChange={(e) => onChangeLocation?.(e.target.value)}
              placeholder="—"
              readOnly={!isEditingDetails}
              disabled={isSavingDetails}
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
            onChange={(e) => onChangeBio?.(e.target.value)}
            placeholder="No bio provided yet."
            readOnly={!isEditingDetails}
            disabled={isSavingDetails}
            className="w-full bg-white border border-slate-200/90 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};
