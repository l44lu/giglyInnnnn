import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User } from "lucide-react";
import { useAuth } from "@/context";

interface AdminHeaderProps {
  adminName?: string;
  adminRole?: string;
  className?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminName,
  adminRole,
  className = "",
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName =
    adminName ??
    (`${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "Admin");
  const displayRole = adminRole ?? "Administrator";

  const handleLogout = () => {
    void logout();
    void navigate("/login", { replace: true });
  };

  return (
    <header
      className={`w-full flex items-center justify-end py-4 px-6 sm:px-8 lg:px-12 bg-transparent border-b border-slate-100 ${className}`}
    >
      <div className="flex items-center gap-5">
        {/* Notification Bell with red badge */}
        <button
          type="button"
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 stroke-[1.75]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Profile Card with Hover/Focus-within Logout Action */}
        <div className="relative group pl-2">
          <div className="flex items-center gap-3 cursor-pointer py-1">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 ring-1 ring-slate-200 shadow-2xs">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                {displayName}
              </h4>
              <p className="text-[11px] text-slate-500 font-normal">
                {displayRole}
              </p>
            </div>
          </div>

          {/* Reveal on hover or keyboard focus-within */}
          <div className="absolute right-0 top-full pt-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-44">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-red-500 text-left"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
