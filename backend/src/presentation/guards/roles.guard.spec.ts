import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (user?: {
    id: string;
    email: string;
    role: Role;
  }) => {
    const request: { user?: { id: string; email: string; role: Role } } = {
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no @Roles() metadata is defined on the route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext({
      id: '1',
      email: 'user@example.com',
      role: Role.WORKER,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should ALLOW access when an ADMIN accesses an ADMIN-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext({
      id: 'admin-1',
      email: 'admin@gigly.com',
      role: Role.ADMIN,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should DENY access with 403 Forbidden when a WORKER accesses an ADMIN-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext({
      id: 'worker-1',
      email: 'alex@gigly.com',
      role: Role.WORKER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should DENY access with 403 Forbidden when a RECRUITER accesses an ADMIN-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext({
      id: 'recruiter-1',
      email: 'sarah@gigly.com',
      role: Role.RECRUITER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw 401 Unauthorized if user is not authenticated or role is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = mockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should ALLOW access if user has one of multiple allowed roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.WORKER, Role.RECRUITER]);

    const workerContext = mockExecutionContext({
      id: 'worker-1',
      email: 'alex@gigly.com',
      role: Role.WORKER,
    });
    expect(guard.canActivate(workerContext)).toBe(true);

    const recruiterContext = mockExecutionContext({
      id: 'recruiter-1',
      email: 'sarah@gigly.com',
      role: Role.RECRUITER,
    });
    expect(guard.canActivate(recruiterContext)).toBe(true);
  });

  it('should ALLOW WORKER and DENY ADMIN/RECRUITER when route requires WORKER', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.WORKER]);

    const workerCtx = mockExecutionContext({
      id: 'worker-1',
      email: 'alex@gigly.com',
      role: Role.WORKER,
    });
    expect(guard.canActivate(workerCtx)).toBe(true);

    const adminCtx = mockExecutionContext({
      id: 'admin-1',
      email: 'admin@gigly.com',
      role: Role.ADMIN,
    });
    expect(() => guard.canActivate(adminCtx)).toThrow(ForbiddenException);

    const recruiterCtx = mockExecutionContext({
      id: 'recruiter-1',
      email: 'sarah@gigly.com',
      role: Role.RECRUITER,
    });
    expect(() => guard.canActivate(recruiterCtx)).toThrow(ForbiddenException);
  });

  it('should ALLOW RECRUITER and DENY ADMIN/WORKER when route requires RECRUITER', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.RECRUITER]);

    const recruiterCtx = mockExecutionContext({
      id: 'recruiter-1',
      email: 'sarah@gigly.com',
      role: Role.RECRUITER,
    });
    expect(guard.canActivate(recruiterCtx)).toBe(true);

    const adminCtx = mockExecutionContext({
      id: 'admin-1',
      email: 'admin@gigly.com',
      role: Role.ADMIN,
    });
    expect(() => guard.canActivate(adminCtx)).toThrow(ForbiddenException);

    const workerCtx = mockExecutionContext({
      id: 'worker-1',
      email: 'alex@gigly.com',
      role: Role.WORKER,
    });
    expect(() => guard.canActivate(workerCtx)).toThrow(ForbiddenException);
  });

  it('should ALLOW all three roles (ADMIN, WORKER, RECRUITER) on shared endpoints like /auth/me', () => {
    reflector.getAllAndOverride.mockReturnValue([
      Role.ADMIN,
      Role.WORKER,
      Role.RECRUITER,
    ]);

    const adminCtx = mockExecutionContext({
      id: 'admin-1',
      email: 'admin@gigly.com',
      role: Role.ADMIN,
    });
    expect(guard.canActivate(adminCtx)).toBe(true);

    const workerCtx = mockExecutionContext({
      id: 'worker-1',
      email: 'alex@gigly.com',
      role: Role.WORKER,
    });
    expect(guard.canActivate(workerCtx)).toBe(true);

    const recruiterCtx = mockExecutionContext({
      id: 'recruiter-1',
      email: 'sarah@gigly.com',
      role: Role.RECRUITER,
    });
    expect(guard.canActivate(recruiterCtx)).toBe(true);

    const unknownRoleCtx = mockExecutionContext({
      id: 'other-1',
      email: 'other@gigly.com',
      role: 'GUEST' as unknown as Role,
    });
    expect(() => guard.canActivate(unknownRoleCtx)).toThrow(ForbiddenException);
  });
});
