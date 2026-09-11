import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context";
import { type UserRole, getDashboardPathForRole } from "@/types/auth";

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  // 1. While authentication state is being initialized, do not redirect; render loading indicator
  if (isLoading) {
    return (
      <div
        data-testid="protected-route-loading"
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-600">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  // 2. If not authenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. If role restriction is specified, verify that the authenticated user has an allowed role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      // Redirect wrong-role user to their own designated dashboard or safe fallback
      const safeDashboard = getDashboardPathForRole(role);
      return <Navigate to={safeDashboard || "/login"} replace />;
    }
  }

  // 4. Authenticated & authorized: render protected component
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
