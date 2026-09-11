import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Custom decorator to specify which roles are allowed to access a route or controller.
 * Example: @Roles(Role.ADMIN) or @Roles(Role.ADMIN, Role.RECRUITER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
