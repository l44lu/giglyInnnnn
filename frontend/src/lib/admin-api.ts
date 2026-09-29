import api from "./api";
import type { AdminUser, SetAdminUserBlockStatusPayload } from "@/types/admin";

/**
 * Fetches all registered users from the Admin user management endpoint.
 * Dispatches GET /admin/users with HttpOnly cookie credentials.
 * Returns an array of verified AdminUser objects.
 */
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await api.get<AdminUser[]>("/admin/users");
  return response.data;
};

/**
 * Fetches a single user by ID from the Admin user management endpoint.
 * Dispatches GET /admin/users/:userId with HttpOnly cookie credentials.
 * Returns the verified AdminUser object.
 */
export const getAdminUser = async (userId: string): Promise<AdminUser> => {
  const response = await api.get<AdminUser>(`/admin/users/${userId}`);
  return response.data;
};

/**
 * Updates the block status of a user.
 * Dispatches PATCH /admin/users/:userId/block with HttpOnly cookie credentials.
 * Returns the updated AdminUser object.
 */
export const setAdminUserBlockStatus = async (
  userId: string,
  isBlocked: boolean,
): Promise<AdminUser> => {
  const payload: SetAdminUserBlockStatusPayload = { isBlocked };
  const response = await api.patch<AdminUser>(
    `/admin/users/${userId}/block`,
    payload,
  );
  return response.data;
};
