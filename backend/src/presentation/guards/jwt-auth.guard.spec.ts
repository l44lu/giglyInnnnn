import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { Role } from '@prisma/client';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockExecutionContext = (authHeader?: string) => {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: authHeader ? { authorization: authHeader } : {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockUser = (overrides?: Partial<UserEntities>) =>
    new UserEntities({
      id: 'user-uuid-123',
      email: 'alex@example.com',
      passWordHash: 'hashedpassword',
      role: Role.WORKER,
      firstName: 'Alex',
      lastName: 'Johnson',
      isActive: true,
      isBlocked: false,
      createdAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    userRepository = {
      findById: jest.fn().mockResolvedValue(createMockUser()),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      updatePassword: jest.fn(),
    };

    guard = new JwtAuthGuard(jwtService, configService, userRepository);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const context = mockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization header is missing'),
    );
  });

  it('should throw UnauthorizedException if Authorization header does not start with Bearer', async () => {
    const context = mockExecutionContext('Basic abc123xyz');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    const context = mockExecutionContext('Bearer invalid.jwt.token');
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('should attach user to request and return true for valid token and active, unblocked user', async () => {
    const context = mockExecutionContext('Bearer valid.jwt.token');
    const mockPayload = {
      sub: 'user-uuid-123',
      email: 'alex@example.com',
      role: 'WORKER' as const,
    };

    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    userRepository.findById.mockResolvedValue(
      createMockUser({ id: 'user-uuid-123', role: Role.WORKER }),
    );

    const result = await guard.canActivate(context);
    const request = context.switchToHttp().getRequest();

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'user-uuid-123',
      email: 'alex@example.com',
      role: 'WORKER',
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token', {
      secret: 'test-jwt-secret',
      algorithms: ['HS256'],
      issuer: 'gigly-auth',
      audience: 'gigly-app',
    });
    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
  });

  describe('Step 9.4: Account Status Enforcement Invariants', () => {
    const validToken = 'Bearer valid.jwt.token';
    const mockPayload = {
      sub: 'user-uuid-123',
      email: 'alex@example.com',
      role: 'WORKER' as const,
    };

    it('DENIES access (401) when user does not exist in database despite cryptographically valid JWT', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('DENIES access (401) when user is BLOCKED (isBlocked === true) even with valid unexpired JWT', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: true, isBlocked: true }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });

    it('DENIES access (401) when user is INACTIVE (isActive === false) even with valid unexpired JWT', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: false, isBlocked: false }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });

    it('DENIES access (401) when user is both INACTIVE and BLOCKED', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: false, isBlocked: true }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });
  });

  describe('Step 9.6: JWT Verification Hardening (Algorithm Pinning, Issuer, Audience)', () => {
    const validToken = 'Bearer valid.jwt.token';
    const mockPayload = {
      sub: 'user-uuid-123',
      email: 'alex@example.com',
      role: 'WORKER' as const,
    };

    it('DENIES access (401) when token algorithm is invalid or unsupported (e.g. none or RS256)', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid algorithm'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('DENIES access (401) when token issuer is invalid / mismatched', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockRejectedValue(
        new Error('jwt issuer invalid. expected: gigly-auth'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('DENIES access (401) when token audience is invalid / mismatched', async () => {
      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockRejectedValue(
        new Error('jwt audience invalid. expected: gigly-app'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('ALLOWS access when custom JWT_ISSUER and JWT_AUDIENCE are configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'custom-secret';
        if (key === 'JWT_ISSUER') return 'custom-issuer';
        if (key === 'JWT_AUDIENCE') return 'custom-audience';
        return undefined;
      });

      const context = mockExecutionContext(validToken);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(createMockUser());

      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token', {
        secret: 'custom-secret',
        algorithms: ['HS256'],
        issuer: 'custom-issuer',
        audience: 'custom-audience',
      });
    });
  });
});
