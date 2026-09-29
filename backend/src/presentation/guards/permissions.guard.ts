import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IAuthorizationRepository } from '../../domain/repositories/authorization.repository.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IAuthorizationRepository)
    private readonly authorizationRepository: IAuthorizationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Read the required permissions attached via @Permissions() metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no @Permissions() decorator is present on the endpoint or class, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 3. Obtain the authenticated user attached to the request by JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. If request.user is missing, user is unauthenticated -> 401 Unauthorized
    if (!user) {
      throw new UnauthorizedException('User is not authenticated');
    }

    // 5. Lazy permission resolution: Resolve active permissions from database if not already cached
    // CRITICAL: Request-local caching only. JWT claims are ignored; DB is the sole security authority.
    if (!user.permissions) {
      user.permissions =
        await this.authorizationRepository.getActivePermissionCodes(user.id);
    }

    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];

    // 6. Strict AND semantics: User must possess ALL required permissions
    const hasAllRequiredPermissions = requiredPermissions.every(
      (requiredPermission) => userPermissions.includes(requiredPermission),
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException(
        `Forbidden resource. Missing required permissions: [${requiredPermissions.join(
          ', ',
        )}]`,
      );
    }

    return true;
  }
}
