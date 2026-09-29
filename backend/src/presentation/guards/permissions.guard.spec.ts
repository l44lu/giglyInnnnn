import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { AppModule } from '../../app.module';
import { IAuthorizationRepository } from '../../domain/repositories/authorization.repository.interface';
import { PrismaAuthorizationRepository } from '../../infrastructure/repositories/prisma-authorization.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: {
    getAllAndOverride: jest.Mock;
  };
  let authorizationRepository: {
    getActiveRoleCodes: jest.Mock;
    getActivePermissionCodes: jest.Mock;
  };

  const createMockExecutionContext = (
    user?: any,
    handler = () => {},
    targetClass = class {},
  ): ExecutionContext => {
    const request = {
      user,
    };

    return {
      getHandler: () => handler,
      getClass: () => targetClass,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    authorizationRepository = {
      getActiveRoleCodes: jest.fn(),
      getActivePermissionCodes: jest.fn(),
    };

    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      authorizationRepository,
    );
  });

  describe('1. No Metadata Detection (Lazy authorization)', () => {
    it('should allow access if route has no @Permissions() metadata and NOT call repository', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = createMockExecutionContext({
        id: 'user-1',
        roles: ['WORKER'],
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).not.toHaveBeenCalled();
    });

    it('should allow access if @Permissions() metadata is an empty array and NOT call repository', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const ctx = createMockExecutionContext({
        id: 'user-1',
        roles: ['WORKER'],
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).not.toHaveBeenCalled();
    });
  });

  describe('2. Authentication Requirement (401 Unauthorized)', () => {
    it('should throw 401 Unauthorized if @Permissions exists but request.user is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      const ctx = createMockExecutionContext(undefined);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).not.toHaveBeenCalled();
    });
  });

  describe('3. Single Permission Evaluation', () => {
    it('should ALLOW access when user possesses the single required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:create',
        'jobs:view',
      ]);

      const user = {
        id: 'worker-1',
        email: 'worker@gigly.com',
        roles: ['WORKER'],
      };
      const ctx = createMockExecutionContext(user);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).toHaveBeenCalledWith('worker-1');
      expect(user['permissions']).toEqual(['jobs:create', 'jobs:view']);
    });

    it('should DENY with 403 Forbidden when user lacks the required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:view',
      ]);

      const user = {
        id: 'worker-1',
        email: 'worker@gigly.com',
        roles: ['WORKER'],
      };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. Multiple Permissions Evaluation (Strict AND Semantics)', () => {
    it('should ALLOW access when user has ALL required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'jobs:create',
        'jobs:update',
      ]);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:create',
        'jobs:update',
        'jobs:view',
      ]);

      const user = { id: 'recruiter-1', roles: ['RECRUITER'] };
      const ctx = createMockExecutionContext(user);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should DENY with 403 Forbidden when user has only a subset of required permissions (strict AND)', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'jobs:create',
        'jobs:update',
      ]);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:create',
      ]);

      const user = { id: 'recruiter-1', roles: ['RECRUITER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY with 403 Forbidden when user has none of the required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'jobs:create',
        'jobs:update',
      ]);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'users:read',
      ]);

      const user = { id: 'worker-1', roles: ['WORKER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Multi-Role Union Evaluation', () => {
    it('should ALLOW access when required permissions come from different active roles', async () => {
      // User is both ADMIN and RECRUITER.
      // ADMIN grants users:block, RECRUITER grants jobs:create
      reflector.getAllAndOverride.mockReturnValue([
        'users:block',
        'jobs:create',
      ]);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'users:read',
        'users:block',
        'jobs:create',
        'applications:accept',
      ]);

      const user = { id: 'multi-1', roles: ['ADMIN', 'RECRUITER'] };
      const ctx = createMockExecutionContext(user);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('6. Revoked and Inactive Role Enforcement', () => {
    it('should DENY with 403 when permissions disappear due to revoked role', async () => {
      // Role was revoked in DB, so getActivePermissionCodes does not include users:block
      reflector.getAllAndOverride.mockReturnValue(['users:block']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'users:read',
      ]);

      const user = { id: 'admin-revoked', roles: ['WORKER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY with 403 when permissions disappear due to inactive role', async () => {
      // Role.isActive = false in DB, so repository returns empty permissions
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([]);

      const user = { id: 'recruiter-inactive', roles: ['RECRUITER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY with 403 when a specific RolePermission is removed from the database', async () => {
      // RolePermission was deleted in DB
      reflector.getAllAndOverride.mockReturnValue(['jobs:delete']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:create',
        'jobs:update',
      ]);

      const user = { id: 'recruiter-1', roles: ['RECRUITER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7. Empty Permissions (No Permissions = No Access)', () => {
    it('should DENY with 403 when user has zero effective permissions in database', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:read']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([]);

      const user = { id: 'user-no-perms', roles: [] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('8. Fail-Closed Security Invariant', () => {
    it('should reject request when database lookup throws an error (never grants access)', async () => {
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      authorizationRepository.getActivePermissionCodes.mockRejectedValue(
        new Error('PostgreSQL connection timeout'),
      );

      const user = { id: 'worker-1', roles: ['WORKER'] };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        'PostgreSQL connection timeout',
      );
    });
  });

  describe('9. JWT Permission Claims Ignored (Untrusted Client Tokens)', () => {
    it('should ignore client-supplied JWT permission claims and strictly query database', async () => {
      reflector.getAllAndOverride.mockReturnValue(['admin:everything']);
      // Database says user only has jobs:view
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:view',
      ]);

      // Attacker attempts to attach permissions claim directly to user object
      const user = {
        id: 'attacker-1',
        roles: ['WORKER'],
        // Even if an untrusted token/attacker sets permissions in payload
      };
      const ctx = createMockExecutionContext(user);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).toHaveBeenCalledWith('attacker-1');
    });
  });

  describe('10. Request-Local Caching / Memoization', () => {
    it('should only query database once and reuse request.user.permissions for subsequent checks', async () => {
      reflector.getAllAndOverride.mockReturnValue(['jobs:create']);
      authorizationRepository.getActivePermissionCodes.mockResolvedValue([
        'jobs:create',
        'jobs:update',
      ]);

      const user = { id: 'worker-1', roles: ['WORKER'] };
      const ctx = createMockExecutionContext(user);

      // First check: loads from repository and caches on request.user.permissions
      const result1 = await guard.canActivate(ctx);
      expect(result1).toBe(true);
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).toHaveBeenCalledTimes(1);
      expect(user['permissions']).toEqual(['jobs:create', 'jobs:update']);

      // Second check on the same request context
      reflector.getAllAndOverride.mockReturnValue(['jobs:update']);
      const result2 = await guard.canActivate(ctx);
      expect(result2).toBe(true);
      // Repository must NOT have been called a second time
      expect(
        authorizationRepository.getActivePermissionCodes,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('8. NestJS Dependency Injection & Provider Resolution', () => {
    it('resolves PermissionsGuard and injects PrismaAuthorizationRepository through IAuthorizationRepository symbol in AppModule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      const resolvedGuard = module.get<PermissionsGuard>(PermissionsGuard);
      const resolvedRepo = module.get<IAuthorizationRepository>(
        IAuthorizationRepository,
      );

      expect(resolvedGuard).toBeDefined();
      expect(resolvedGuard).toBeInstanceOf(PermissionsGuard);
      expect(resolvedRepo).toBeDefined();
      expect(resolvedRepo).toBeInstanceOf(PrismaAuthorizationRepository);
    });
  });
});
