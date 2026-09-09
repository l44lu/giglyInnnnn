import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Read the required roles attached via @Roles() metadata from the handler and class
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. If no @Roles() decorator is present on the endpoint or class, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Obtain the authenticated user attached to the request by JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. If request.user is missing or has no role, user is unauthenticated
    if (!user || !user.role) {
      throw new UnauthorizedException(
        'User is not authenticated or role is missing',
      );
    }

    // 5. Check if user's role matches any of the required roles
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Forbidden resource. Requires one of the following roles: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
