import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Custom decorator to specify which permissions are required to access a route or controller.
 * Permissions follow the format 'resource:action' (e.g. 'users:block', 'jobs:create').
 * Requires ALL specified permissions (strict AND semantics).
 *
 * Example:
 * @Permissions('users:block')
 * @Permissions('jobs:create', 'jobs:update')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
