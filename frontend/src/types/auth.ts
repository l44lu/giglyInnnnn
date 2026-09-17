export type UserRole = "ADMIN" | "WORKER" | "RECRUITER";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
}

export interface RefreshResponse {
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token?: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userOrToken?: User | string, user?: User) => Promise<User | null>;
  logout: () => Promise<void> | void;
  refreshUser: () => Promise<User | null>;
}

export const getDashboardPathForRole = (
  role: string | null | undefined,
): string | null => {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "WORKER":
      return "/worker/dashboard";
    case "RECRUITER":
      return "/recruiter/dashboard";
    default:
      return null;
  }
};
