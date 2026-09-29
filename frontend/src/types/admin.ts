import type { UserRole } from "./auth";

/**
 * Frontend representation of the verified backend AdminUserResponseDto.
 * Represents only currently supported fields returned by /admin/users endpoints.
 */
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
}

/**
 * Payload for updating a user's block status via PATCH /admin/users/:userId/block.
 */
export interface SetAdminUserBlockStatusPayload {
  isBlocked: boolean;
}
