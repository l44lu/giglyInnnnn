import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { Role } from '../../domain/enums/role.enum';
import {
  ITokenService,
  InvalidTokenError,
  TokenExpiredError,
  AccessTokenPayload,
} from '../../domain/services/token.service.interface';
import { AuthCookieService } from '../auth/services/auth-cookie.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokenService: jest.Mocked<ITokenService>;
  let userRepository: jest.Mocked<IUserRepository>;
  let authCookieService: AuthCookieService;
  let configService: jest.Mocked<ConfigService>;

  const mockExecutionContext = (
    authHeader?: string,
    cookies?: Record<string, string>,
  ) => {
    const request: {
      headers: Record<string, string>;
      cookies?: Record<string, string>;
      user?: unknown;
    } = {
      headers: authHeader ? { authorization: authHeader } : {},
      cookies:
        cookies !== undefined
          ? cookies
          : authHeader
            ? {}
            : { access_token: 'valid.jwt.token' },
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

  const mockPayload: AccessTokenPayload = {
    sub: 'user-uuid-123',
    email: 'alex@example.com',
    role: Role.WORKER,
  };

  beforeEach(() => {
    tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue(mockPayload),
      verifyRefreshToken: jest.fn(),
      issueAccessToken: jest.fn(),
      issueRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<ITokenService>;

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

    authCookieService = new AuthCookieService(configService);
    guard = new JwtAuthGuard(tokenService, userRepository, authCookieService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should delegate access token extraction to AuthCookieService', async () => {
    const mockAuthCookieService = {
      getAccessToken: jest.fn().mockReturnValue('valid.jwt.token'),
    } as unknown as AuthCookieService;

    const testGuard = new JwtAuthGuard(
      tokenService,
      userRepository,
      mockAuthCookieService,
    );
    const context = mockExecutionContext(undefined, {
      access_token: 'valid.jwt.token',
    });

    const result = await testGuard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuthCookieService.getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('should throw UnauthorizedException if access_token cookie is missing', async () => {
    const context = mockExecutionContext(undefined, {});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException if Bearer header is sent without access_token cookie', async () => {
    const context = mockExecutionContext('Bearer valid.jwt.token', {});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException if token verification fails with InvalidTokenError', async () => {
    const context = mockExecutionContext(undefined, {
      access_token: 'invalid.jwt.token',
    });
    tokenService.verifyAccessToken.mockRejectedValue(
      new InvalidTokenError('Invalid token signature'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('should throw UnauthorizedException if token verification fails with TokenExpiredError', async () => {
    const context = mockExecutionContext(undefined, {
      access_token: 'expired.jwt.token',
    });
    tokenService.verifyAccessToken.mockRejectedValue(
      new TokenExpiredError('Token has expired'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('should propagate unexpected infrastructure errors without converting to 401', async () => {
    const context = mockExecutionContext(undefined, {
      access_token: 'valid.jwt.token',
    });
    tokenService.verifyAccessToken.mockRejectedValue(
      new Error('Internal keystore uncontactable'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Internal keystore uncontactable',
    );
  });

  it('should attach user to request and return true for valid token and active, unblocked user', async () => {
    const context = mockExecutionContext(undefined, {
      access_token: 'valid.jwt.token',
    });

    tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
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

    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith(
      'valid.jwt.token',
    );
    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
  });

  it('should use live database role for request.user instead of trusting JWT payload claim alone', async () => {
    const context = mockExecutionContext(undefined, {
      access_token: 'valid.jwt.token',
    });

    // JWT claim says WORKER, but database user has been promoted to ADMIN
    tokenService.verifyAccessToken.mockResolvedValue({
      ...mockPayload,
      role: Role.WORKER,
    });
    userRepository.findById.mockResolvedValue(
      createMockUser({ id: 'user-uuid-123', role: Role.ADMIN }),
    );

    const result = await guard.canActivate(context);
    const request = context.switchToHttp().getRequest();

    expect(result).toBe(true);
    expect(request.user.role).toBe(Role.ADMIN);
  });

  describe('Step 9.4: Account Status Enforcement Invariants', () => {
    const validCookie = { access_token: 'valid.jwt.token' };

    it('DENIES access (401) when user does not exist in database despite cryptographically valid JWT', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('DENIES access (401) when user is BLOCKED (isBlocked === true) even with valid unexpired JWT', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: true, isBlocked: true }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });

    it('DENIES access (401) when user is INACTIVE (isActive === false) even with valid unexpired JWT', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: false, isBlocked: false }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });

    it('DENIES access (401) when user is both INACTIVE and BLOCKED', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(
        createMockUser({ isActive: false, isBlocked: true }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User account is inactive or blocked'),
      );
    });
  });

  describe('Step 9.6: JWT Verification Hardening via ITokenService', () => {
    const validCookie = { access_token: 'valid.jwt.token' };

    it('DENIES access (401) when token algorithm is invalid or unsupported', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockRejectedValue(
        new InvalidTokenError('invalid algorithm: none'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('DENIES access (401) when token issuer is invalid / mismatched', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockRejectedValue(
        new InvalidTokenError('jwt issuer invalid. expected: gigly-auth'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('DENIES access (401) when token audience is invalid / mismatched', async () => {
      const context = mockExecutionContext(undefined, validCookie);
      tokenService.verifyAccessToken.mockRejectedValue(
        new InvalidTokenError('jwt audience invalid. expected: gigly-app'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });
  });

  describe('Step 2: Cookie Authentication and Bearer Fallback', () => {
    it('authenticates successfully with valid access_token cookie without Authorization header', async () => {
      const context = mockExecutionContext(undefined, {
        access_token: 'valid.cookie.token',
      });
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(createMockUser());

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user).toEqual({
        id: 'user-uuid-123',
        email: 'alex@example.com',
        role: 'WORKER',
      });
      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith(
        'valid.cookie.token',
      );
    });

    it('prefers access_token cookie over Authorization header when both are provided', async () => {
      const context = mockExecutionContext('Bearer header.token', {
        access_token: 'cookie.token',
      });
      tokenService.verifyAccessToken.mockResolvedValue(mockPayload);
      userRepository.findById.mockResolvedValue(createMockUser());

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith(
        'cookie.token',
      );
    });

    it('rejects Authorization Bearer token when access_token cookie is absent (Bearer fallback removed)', async () => {
      const context = mockExecutionContext('Bearer header.token', {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authentication token is missing'),
      );
    });

    it('throws 401 when both cookie and Authorization header are missing', async () => {
      const context = mockExecutionContext(undefined, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authentication token is missing'),
      );
    });

    it('throws 401 when access_token cookie has invalid signature', async () => {
      const context = mockExecutionContext(undefined, {
        access_token: 'invalid.cookie.token',
      });
      tokenService.verifyAccessToken.mockRejectedValue(
        new InvalidTokenError('invalid signature'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('throws 401 when access_token cookie is expired', async () => {
      const context = mockExecutionContext(undefined, {
        access_token: 'expired.cookie.token',
      });
      tokenService.verifyAccessToken.mockRejectedValue(
        new TokenExpiredError('jwt expired'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('throws 401 when access_token cookie is tampered or malformed', async () => {
      const context = mockExecutionContext(undefined, {
        access_token: 'tampered.token.data',
      });
      tokenService.verifyAccessToken.mockRejectedValue(
        new InvalidTokenError('jwt malformed'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });
  });
});
