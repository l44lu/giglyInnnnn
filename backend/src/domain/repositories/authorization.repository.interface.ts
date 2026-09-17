export interface IAuthorizationRepository {
  /**
   * Retrieves all active role codes assigned to a user.
   * Resolves via User.roleId -> Role where Role.isActive IS true.
   */
  getActiveRoleCodes(userId: string): Promise<string[]>;

  /**
   * Retrieves all active, effective permission codes granted to a user for their assigned role.
   * Traverses: User.roleId -> active Role (isActive = true) -> RolePermission -> Permission.
   * Returns a deduplicated union of permission codes.
   */
  getActivePermissionCodes(userId: string): Promise<string[]>;
}

export const IAuthorizationRepository = Symbol('IAuthorizationRepository');
