import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Building2,
  Briefcase,
  CircleDollarSign,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  activeTab?: string;
  className?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab = "dashboard",
  className = "",
}) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const overviewItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutGrid,
      path: "/admin/dashboard",
    },
  ];

  const managementItems = [
    {
      id: "workers",
      name: "Workers",
      icon: Users,
      path: "/admin/workers",
    },
    {
      id: "recruiters",
      name: "Recruiters",
      icon: Building2,
      path: "/admin/recruiters",
    },
    {
      id: "gigs-jobs",
      name: "Gigs & Jobs",
      icon: Briefcase,
      path: "/admin/gigs-jobs",
    },
  ];

  const operationsItems = [
    {
      id: "finances",
      name: "Finances",
      icon: CircleDollarSign,
      path: "/admin/finances",
    },
    {
      id: "disputes",
      name: "Disputes",
      icon: ShieldAlert,
      path: "/admin/disputes",
    },
  ];

  const isCurrentActive = (id: string, path: string) => {
    if (activeTab === id) return true;
    return location.pathname === path;
  };

  const renderNavGroup = (
    title: string,
    items: {
      id: string;
      name: string;
      icon: React.ComponentType<{ className?: string }>;
      path: string;
    }[],
  ) => (
    <div className="mb-6">
      <p className="px-3.5 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => {
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
  );

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full min-h-screen p-6 bg-[#f3f7fa] border-r border-slate-200/80 text-slate-700 w-64 select-none">
      <div>
        {/* Brand Logo */}
        <div className="flex items-center justify-between pb-8">
          <Link
            to="/admin/dashboard"
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

        {/* Navigation Sections */}
        {renderNavGroup("Overview", overviewItems)}
        {renderNavGroup("Management", managementItems)}
        {renderNavGroup("Operations", operationsItems)}
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

export default AdminSidebar;
