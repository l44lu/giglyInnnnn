import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { RefreshTokenHashingService } from '../../../../infrastructure/crypto/refresh-token-hashing.service';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '@prisma/client';
import { RefreshTokenEntity } from '../../../../domain/entities/refresh-token.entity';

describe('LoginUseCase — Refresh Token Hashing At Rest', () => {
  let useCase: LoginUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let refreshTokenHashingService: IRefreshTokenHashingService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = new UserEntities({
    id: 'user-uuid-123',
    email: 'worker@gigly.com',
    passWordHash: '', // populated in beforeEach
    role: Role.WORKER,
    firstName: 'Alex',
    lastName: 'Johnson',
    createdAt: new Date(),
  });

  const rawAccessJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.payload.mock';
  const rawRefreshJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload.mock';

  beforeEach(async () => {
    mockUser.passWordHash = await bcrypt.hash('CorrectPassword123!', 10);

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    refreshTokenRepository = {
      findByToken: jest.fn(),
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokenRepository>;

    refreshTokenHashingService = new RefreshTokenHashingService();

    jwtService = {
      signAsync: jest.fn().mockImplementation((payload, options) => {
        if (options && options.secret === 'test-refresh-secret') {
          return Promise.resolve(rawRefreshJwt);
        }
        return Promise.resolve(rawAccessJwt);
      }),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new LoginUseCase(
      userRepository,
      refreshTokenRepository,
      refreshTokenHashingService,
      jwtService,
      configService,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Authentication Validation', () => {
    it('throws UnauthorizedException if user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute({
          email: 'unknown@gigly.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException if password does not match', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({
          email: 'worker@gigly.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('DENIES login (401 Invalid credentials) when user is BLOCKED (isBlocked === true)', async () => {
      const blockedUser = new UserEntities({
        id: 'blocked-user-1',
        email: 'blocked@gigly.com',
        passWordHash: mockUser.passWordHash,
        role: Role.WORKER,
        firstName: 'Blocked',
        lastName: 'User',
        isActive: true,
        isBlocked: true,
        createdAt: new Date(),
      });
      userRepository.findByEmail.mockResolvedValue(blockedUser);

      await expect(
        useCase.execute({
          email: 'blocked@gigly.com',
          password: 'CorrectPassword123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('DENIES login (401 Invalid credentials) when user is INACTIVE (isActive === false)', async () => {
      const inactiveUser = new UserEntities({
        id: 'inactive-user-1',
        email: 'inactive@gigly.com',
        passWordHash: mockUser.passWordHash,
        role: Role.WORKER,
        firstName: 'Inactive',
        lastName: 'User',
        isActive: false,
        isBlocked: false,
        createdAt: new Date(),
      });
      userRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(
        useCase.execute({
          email: 'inactive@gigly.com',
          password: 'CorrectPassword123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('DENIES login (401 Invalid credentials) when user is both INACTIVE and BLOCKED', async () => {
      const inactiveBlockedUser = new UserEntities({
        id: 'inactive-blocked-1',
        email: 'inactive-blocked@gigly.com',
        passWordHash: mockUser.passWordHash,
        role: Role.WORKER,
        firstName: 'Inactive',
        lastName: 'Blocked',
        isActive: false,
        isBlocked: true,
        createdAt: new Date(),
      });
      userRepository.findByEmail.mockResolvedValue(inactiveBlockedUser);

      await expect(
        useCase.execute({
          email: 'inactive-blocked@gigly.com',
          password: 'CorrectPassword123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Token Hashing At Rest Verification', () => {
    it('returns raw JWT tokens to the client but persists only the SHA-256 hash in the database', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockImplementation((data) => {
        return Promise.resolve(
          new RefreshTokenEntity({
            id: 'token-row-id-1',
            token: data.token!,
            userId: data.userId!,
            expiresAt: data.expiresAt!,
            createdAt: new Date(),
          }),
        );
      });

      const response = await useCase.execute({
        email: 'worker@gigly.com',
        password: 'CorrectPassword123!',
      });

      // 1. Response contains raw JWT tokens for the client
      expect(response.access_token).toBe(rawAccessJwt);
      expect(response.refresh_token).toBe(rawRefreshJwt);
      expect(response.refresh_token).toMatch(/^eyJ/);
      expect(response.user.email).toBe('worker@gigly.com');

      // 2. Repository create was called exactly once
      expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);

      const createArg = refreshTokenRepository.create.mock.calls[0][0];
      const storedToken = createArg.token as string;

      // 3. The value passed to repository is NOT the raw refresh JWT
      expect(storedToken).not.toBe(rawRefreshJwt);
      expect(storedToken).not.toContain('eyJ');

      // 4. The stored value is a 64-character lowercase hexadecimal string (SHA-256)
      expect(storedToken).toHaveLength(64);
      expect(storedToken).toMatch(/^[0-9a-f]{64}$/);

      // 5. The stored value matches the deterministic hash of the raw token
      const expectedHash = refreshTokenHashingService.hash(rawRefreshJwt);
      expect(storedToken).toBe(expectedHash);

      // 6. User ID and expiration date are properly saved
      expect(createArg.userId).toBe('user-uuid-123');
      expect(createArg.expiresAt).toBeInstanceOf(Date);
      expect((createArg.expiresAt as Date).getTime()).toBeGreaterThan(
        Date.now(),
      );

      // 7. Token Family ID is generated as a secure UUID (9C-4)
      expect(createArg.familyId).toBeDefined();
      expect(createArg.familyId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('TEST 13: each new login generates a unique and independent token family (F2 !== F1)', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockResolvedValue(
        new RefreshTokenEntity({ id: 'tok-1' }),
      );

      await useCase.execute({
        email: 'worker@gigly.com',
        password: 'CorrectPassword123!',
      });
      await useCase.execute({
        email: 'worker@gigly.com',
        password: 'CorrectPassword123!',
      });

      expect(refreshTokenRepository.create).toHaveBeenCalledTimes(2);
      const firstFamilyId =
        refreshTokenRepository.create.mock.calls[0][0].familyId;
      const secondFamilyId =
        refreshTokenRepository.create.mock.calls[1][0].familyId;

      expect(firstFamilyId).toBeDefined();
      expect(secondFamilyId).toBeDefined();
      expect(firstFamilyId).not.toBe(secondFamilyId);
    });
  });
});
