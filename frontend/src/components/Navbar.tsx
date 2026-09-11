import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 md:px-12">
        <Link
          to="/"
          className="text-2xl font-black tracking-tight text-slate-900"
        >
          Gigly
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link
            to="/worker/dashboard"
            className="hover:text-slate-900 transition-colors"
          >
            Worker Dashboard
          </Link>
          <Link
            to="/recruiter/dashboard"
            className="hover:text-slate-900 transition-colors"
          >
            Recruiter Dashboard
          </Link>
          <Link
            to="/admin/dashboard"
            className="hover:text-slate-900 transition-colors"
          >
            Admin Dashboard
          </Link>
          <Link to="/login" className="hover:text-slate-900 transition-colors">
            Find Work
          </Link>
          <Link to="/signup" className="hover:text-slate-900 transition-colors">
            Post a Gig
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-sm font-medium">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-[#1877f2] hover:bg-blue-700 text-white text-sm font-medium">
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
