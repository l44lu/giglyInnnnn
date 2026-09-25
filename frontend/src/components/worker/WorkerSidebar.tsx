import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Search,
  Briefcase,
  MessageSquare,
  Users,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/context";
import { getAvatarVersion, fetchWorkerAvatarBlob } from "@/lib/worker-api";

export interface WorkerSidebarProps {
  activeTab?: string;
  className?: string;
  avatarVersion?: string | number;
}

export const WorkerSidebar: React.FC<WorkerSidebarProps> = ({
  activeTab = "dashboard",
  className = "",
  avatarVersion: propAvatarVersion,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const [syncedVersion, setSyncedVersion] = useState<
    string | number | undefined
  >(() => getAvatarVersion());

  useEffect(() => {
    const handleVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setSyncedVersion(customEvent.detail);
    };
    window.addEventListener(
      "gigly:avatar-version-updated",
      handleVersionUpdate,
    );
    return () => {
      window.removeEventListener(
        "gigly:avatar-version-updated",
        handleVersionUpdate,
      );
    };
  }, []);

  const activeVersion = propAvatarVersion ?? syncedVersion;
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false);

  const rawAvatarUrl = user?.avatarUrl?.trim();

  useEffect(() => {
    let isMounted = true;
    let localUrl: string | null = null;

    const loadAvatar = async () => {
      if (!rawAvatarUrl) {
        return;
      }

      try {
        const blob = await fetchWorkerAvatarBlob(activeVersion);
        if (!isMounted) return;
        if (blob) {
          localUrl = URL.createObjectURL(blob);
          setAvatarObjectUrl(localUrl);
          setAvatarLoadError(false);
        } else {
          setAvatarObjectUrl(null);
        }
      } catch {
        if (isMounted) {
          setAvatarObjectUrl(null);
          setAvatarLoadError(true);
        }
      }
    };

    void loadAvatar();

    return () => {
      isMounted = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [rawAvatarUrl, activeVersion]);

  const currentAvatarUrl = rawAvatarUrl ? avatarObjectUrl : null;

  const displayName =
    `${user?.firstName ?? ""}`.trim() || `${user?.lastName ?? ""}`.trim()
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "Worker";

  const handleLogout = () => {
    void logout();
    void navigate("/login", { replace: true });
  };

  const navItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutGrid,
      path: "/worker/dashboard",
    },
    {
      id: "find-jobs",
      name: "Find Jobs",
      icon: Search,
      path: "/worker/find-jobs",
    },
    {
      id: "my-jobs",
      name: "My Jobs",
      icon: Briefcase,
      path: "/worker/my-jobs",
    },
    {
      id: "messages",
      name: "Messages",
      icon: MessageSquare,
      path: "/worker/messages",
      badge: 3,
    },
  ];

  const networkItems = [
    {
      id: "clients",
      name: "Clients",
      icon: Users,
      path: "/worker/clients",
    },
  ];

  const isCurrentActive = (id: string, path: string) => {
    if (activeTab === id) return true;
    return location.pathname === path;
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full min-h-screen p-6 bg-[#f3f7fa] border-r border-slate-200/80 text-slate-700 w-64 select-none">
      {/* Brand & Main Navigation */}
      <div>
        {/* Logo */}
        <div className="flex items-center justify-between pb-8">
          <Link
            to="/worker/dashboard"
            className="text-2xl font-black tracking-tight text-slate-900 font-sans"
          >
            Gigly
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-200/60 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.id, item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  active
                    ? "bg-[#1877f2] text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${
                      active
                        ? "bg-white text-[#1877f2]"
                        : "bg-[#1877f2] text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Network Section */}
        <div className="mt-8">
          <p className="px-3.5 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Network
          </p>
          <nav className="space-y-1">
            {networkItems.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.id, item.path);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    active
                      ? "bg-[#1877f2] text-white shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile Card with Hover/Focus Logout Action */}
      <div className="pt-4 border-t border-slate-200/70 mt-auto group">
        <div
          className={`p-1.5 rounded-xl transition ${
            isCurrentActive("profile", "/worker/profile")
              ? "bg-slate-200/70"
              : "hover:bg-slate-200/40"
          }`}
        >
          <Link
            to="/worker/profile"
            className="flex items-center gap-3 cursor-pointer"
            aria-label="View worker profile"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm overflow-hidden">
              {currentAvatarUrl && !avatarLoadError ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  onError={() => setAvatarLoadError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {displayName}
              </h4>
              <p className="text-xs text-slate-500 truncate">Worker</p>
            </div>
          </Link>

          {/* Reveal on hover or keyboard focus-within */}
          <div className="overflow-hidden transition-all duration-200 max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 group-focus-within:max-h-12 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-red-600 bg-red-50/90 hover:bg-red-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-red-500 cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700 hover:bg-slate-50"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen overflow-y-auto ${className}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#f3f7fa] z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerSidebar;
