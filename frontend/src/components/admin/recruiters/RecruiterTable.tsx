import React from "react";
import type { AdminUser } from "@/types/admin";

export interface RecruiterTableProps {
  recruiters: AdminUser[];
  onViewProfile?: (recruiterId: string) => void;
  onToggleBlock?: (recruiterId: string, nextBlockedState: boolean) => void;
  blockingRecruiterId?: string | null;
}

export const RecruiterTable: React.FC<RecruiterTableProps> = ({
  recruiters,
  onViewProfile,
  onToggleBlock,
  blockingRecruiterId,
}) => {
  // Ensure only accounts with role RECRUITER are rendered
  const recruiterUsers = recruiters.filter((user) => user.role === "RECRUITER");

  const getAccountStatus = (recruiter: AdminUser) => {
    if (recruiter.isBlocked) {
      return {
        label: "Blocked",
        className: "bg-rose-50 text-rose-700 border-rose-200/60",
      };
    }
    if (!recruiter.isActive) {
      return {
        label: "Inactive",
        className: "bg-slate-100 text-slate-600 border-slate-200/60",
      };
    }
    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    };
  };

  return (
    <div className="overflow-x-auto">
      <table
        data-testid="admin-recruiter-table"
        className="w-full text-left border-collapse"
      >
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
            <th className="pb-3 pr-4 font-medium">Recruiter</th>
            <th className="pb-3 px-4 font-medium">Status</th>
            <th className="pb-3 pl-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
          {recruiterUsers.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="py-12 text-center text-sm text-slate-500"
              >
                No recruiters found.
              </td>
            </tr>
          ) : (
            recruiterUsers.map((recruiter) => {
              const fullName =
                `${recruiter.firstName || ""} ${recruiter.lastName || ""}`.trim() ||
                recruiter.email;
              const initials =
                `${recruiter.firstName?.[0] || ""}${recruiter.lastName?.[0] || ""}`.toUpperCase() ||
                "R";
              const status = getAccountStatus(recruiter);
              const shortId = recruiter.id ? recruiter.id.slice(0, 8) : "";

              return (
                <tr
                  key={recruiter.id}
                  data-testid={`recruiter-row-${recruiter.id}`}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* Recruiter Identity Cell */}
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        data-testid={`recruiter-avatar-${recruiter.id}`}
                        className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-semibold text-xs sm:text-sm shrink-0"
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div
                          data-testid={`recruiter-name-${recruiter.id}`}
                          className="text-sm font-semibold text-slate-900 truncate"
                        >
                          {fullName}
                        </div>
                        <div
                          data-testid={`recruiter-email-${recruiter.id}`}
                          className="text-xs text-slate-500 truncate"
                        >
                          {recruiter.email}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                          <span
                            data-testid={`recruiter-location-${recruiter.id}`}
                          >
                            {recruiter.location || "Location not set"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span data-testid={`recruiter-id-${recruiter.id}`}>
                            ID #{shortId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Cell */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      data-testid={`recruiter-status-${recruiter.id}`}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>

                  {/* Actions Cell */}
                  <td className="py-4 pl-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        data-testid={`btn-block-toggle-${recruiter.id}`}
                        disabled={Boolean(blockingRecruiterId)}
                        onClick={() =>
                          onToggleBlock?.(recruiter.id, !recruiter.isBlocked)
                        }
                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          recruiter.isBlocked
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        {blockingRecruiterId === recruiter.id
                          ? recruiter.isBlocked
                            ? "Unblocking..."
                            : "Blocking..."
                          : recruiter.isBlocked
                            ? "Unblock user"
                            : "Block user"}
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-view-profile-${recruiter.id}`}
                        onClick={() => onViewProfile?.(recruiter.id)}
                        className="bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        View profile
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RecruiterTable;
