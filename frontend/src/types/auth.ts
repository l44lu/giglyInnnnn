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
  access_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: User) => Promise<User | null>;
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
