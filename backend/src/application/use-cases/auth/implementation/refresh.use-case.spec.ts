import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshUseCase } from './refresh.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { RefreshTokenHashingService } from '../../../../infrastructure/crypto/refresh-token-hashing.service';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '@prisma/client';
import { RefreshTokenEntity } from '../../../../domain/entities/refresh-token.entity';

describe('RefreshUseCase — Token Rotation & Invalidation (9C-3)', () => {
  let useCase: RefreshUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let refreshTokenHashingService: IRefreshTokenHashingService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const rawRefreshJwtA =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenA.refresh.mock';
  const rawRefreshJwtB =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenB.rotated.refresh.mock';
  const newAccessJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.access.token.mock';

  const mockUser = new UserEntities({
    id: 'user-uuid-123',
    email: 'worker@gigly.com',
    passWordHash: 'hashedpassword',
    role: Role.WORKER,
    firstName: 'Alex',
    lastName: 'Johnson',
    createdAt: new Date(),
  });

  beforeEach(() => {
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
      deleteByTokenHash: jest.fn().mockResolvedValue(true),
      rotate: jest.fn().mockResolvedValue(true),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokenRepository>;

    refreshTokenHashingService = new RefreshTokenHashingService();

    jwtService = {
      verifyAsync: jest.fn(),
      signAsync: jest.fn().mockImplementation((payload, options) => {
        if (options && options.secret === 'test-refresh-secret') {
          return Promise.resolve(rawRefreshJwtB);
        }
        return Promise.resolve(newAccessJwt);
      }),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new RefreshUseCase(
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

  describe('Input Validation & JWT Verification', () => {
    it('1. Missing refresh token → throws 401', async () => {
      await expect(useCase.execute({ refresh_token: '' })).rejects.toThrow(
        new UnauthorizedException('Refresh token is required'),
      );

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
    });

    it('2 & 3. Invalid JWT / invalid signature → throws 401', async () => {
      jwtService.verifyAsync.mockRejectedValue(
        new Error('invalid signature error'),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(UnauthorizedException);

      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
    });
  });

  describe('Database Hash Lookup & Expiration', () => {
    it('4. Hash lookup is performed using the hashed incoming token', async () => {
      const expectedHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-2',
          token: refreshTokenHashingService.hash(rawRefreshJwtB),
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
        }),
      );

      await useCase.execute({ refresh_token: rawRefreshJwtA });

      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        expectedHash,
      );
    });

    it('5. Token not found in DB → throws 401', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.deleteByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('6. DB-expired token → throws 401', async () => {
      const expectedHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 minute ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
        }),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.deleteByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });

    it('7. User not found in DB → throws 401', async () => {
      const expectedHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
        }),
      );
      userRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(new UnauthorizedException('User not found'));

      expect(refreshTokenRepository.deleteByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Token Rotation Behavior (8-17)', () => {
    it('successfully consumes old token, stores new token hash, and returns { access_token, refresh_token }', async () => {
      const oldTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);
      const expectedNewHash = refreshTokenHashingService.hash(rawRefreshJwtB);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-uuid-1',
          revokedAt: null,
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.rotate.mockResolvedValue(true);

      // 8. Valid refresh succeeds
      const result = await useCase.execute({ refresh_token: rawRefreshJwtA });

      // 9. New access token is issued
      expect(result.access_token).toBe(newAccessJwt);

      // 10. New refresh token is issued
      expect(result.refresh_token).toBe(rawRefreshJwtB);

      // 11. New refresh token differs from old refresh token
      expect(result.refresh_token).not.toBe(rawRefreshJwtA);

      // 12 & 14 & 15. Atomically marks old token as revoked and creates new token in one repository operation
      expect(refreshTokenRepository.rotate).toHaveBeenCalledTimes(1);
      const [calledOldHash, calledNewData] =
        refreshTokenRepository.rotate.mock.calls[0];
      expect(calledOldHash).toBe(oldTokenHash);
      expect(calledNewData.token).toBe(expectedNewHash);
      expect(calledNewData.token).toHaveLength(64);
      expect(calledNewData.token).toMatch(/^[0-9a-f]{64}$/);
      expect(calledNewData.userId).toBe('user-uuid-123');
      expect(calledNewData.expiresAt).toBeInstanceOf(Date);
      // TEST 2: Rotation preserves the token family
      expect(calledNewData.familyId).toBe('family-uuid-1');

      // 13. Raw new refresh token is returned to caller
      expect(result.refresh_token).toBe(rawRefreshJwtB);

      // 16. Hash of new raw refresh token matches the persisted hash
      expect(refreshTokenHashingService.hash(result.refresh_token!)).toBe(
        calledNewData.token,
      );

      // 17. The response does NOT expose the hash
      expect(result.refresh_token).not.toBe(calledNewData.token);
      expect(result.refresh_token!.startsWith('eyJ')).toBe(true);
      expect(result.refresh_token).not.toMatch(/^[0-9a-f]{64}$/);
    });

    it('rejects if old token was already consumed by a concurrent request', async () => {
      const oldTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-uuid-1',
          revokedAt: null,
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);

      // Simulate concurrent deletion / already consumed: rotate returns false
      refreshTokenRepository.rotate.mockResolvedValue(false);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'family-uuid-1',
      );
    });

    it('propagates unexpected database failure during rotation without converting to UnauthorizedException', async () => {
      const oldTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-uuid-1',
          revokedAt: null,
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);

      // Simulate database crash or deadlock during rotation
      const dbCrashError = new Error('Database transaction deadlock');
      refreshTokenRepository.rotate.mockRejectedValue(dbCrashError);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow('Database transaction deadlock');
    });
  });

  describe('Refresh Token Reuse Detection & Token Family Revocation (9C-4)', () => {
    it('TEST 5: detects token reuse when already-revoked token is presented, revokes entire family, and returns 401', async () => {
      const consumedTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-consumed',
          token: consumedTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(Date.now() - 1000 * 60 * 10),
          familyId: 'compromised-family-123',
          revokedAt: new Date(Date.now() - 1000 * 60 * 5), // Already revoked!
        }),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      // Entire family is revoked
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'compromised-family-123',
      );

      // No new tokens signed
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('TEST 8: unknown token rejected with 401 and does NOT revoke any family', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('TEST 9: tampered token rejected with 401 before database lookup, no family revoked', async () => {
      jwtService.verifyAsync.mockRejectedValue(
        new Error('invalid signature error'),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(UnauthorizedException);

      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('TEST 14: family isolation — revoking family F1 does not affect active tokens in family F2', async () => {
      // Simulate two families in simulated storage
      const dbTokens = new Map<string, RefreshTokenEntity>();

      const hashF1_A = refreshTokenHashingService.hash(rawRefreshJwtA);
      const hashF2_X = refreshTokenHashingService.hash(rawRefreshJwtB);

      // Family F1: Token A (consumed)
      dbTokens.set(
        hashF1_A,
        new RefreshTokenEntity({
          id: 'tok-f1-a',
          token: hashF1_A,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-F1',
          revokedAt: new Date(), // Revoked!
        }),
      );

      // Family F2: Token X (active)
      dbTokens.set(
        hashF2_X,
        new RefreshTokenEntity({
          id: 'tok-f2-x',
          token: hashF2_X,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-F2',
          revokedAt: null, // Active!
        }),
      );

      refreshTokenRepository.findByTokenHash.mockImplementation((hash) =>
        Promise.resolve(dbTokens.get(hash) ?? null),
      );
      refreshTokenRepository.revokeFamily.mockImplementation((familyId) => {
        for (const token of dbTokens.values()) {
          if (token.familyId === familyId) {
            token.revokedAt = new Date();
          }
        }
        return Promise.resolve();
      });

      // 1. Presenting revoked Token A from Family F1 triggers reuse detection
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'family-F1',
      );

      // 2. Family F1 is revoked, but Family F2 is completely unaffected!
      expect(dbTokens.get(hashF1_A)?.revokedAt).not.toBeNull();
      expect(dbTokens.get(hashF2_X)?.revokedAt).toBeNull(); // Remains ACTIVE!
    });
  });

  describe('Sequential Rotation & Reuse Detection Lifecycle (Token A → B → reuse A revokes B)', () => {
    it('proves rotated token A remains in DB as revoked, and presenting A again revokes family and invalidates B', async () => {
      // In-memory token store simulating PostgreSQL RefreshToken table with 9C-4 model
      const dbTokens = new Map<string, RefreshTokenEntity>();

      // Initial state: Token A created on login (Family F1, active)
      const hashA = refreshTokenHashingService.hash(rawRefreshJwtA);
      dbTokens.set(
        hashA,
        new RefreshTokenEntity({
          id: 'token-id-A',
          token: hashA,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'family-F1',
          revokedAt: null,
        }),
      );

      userRepository.findById.mockResolvedValue(mockUser);

      // Wire repository mocks to simulated DB
      refreshTokenRepository.findByTokenHash.mockImplementation((hash) => {
        return Promise.resolve(dbTokens.get(hash) ?? null);
      });
      refreshTokenRepository.rotate.mockImplementation((oldHash, newData) => {
        const existing = dbTokens.get(oldHash);
        if (!existing || existing.revokedAt !== null) {
          return Promise.resolve(false);
        }
        // Mark old token as revoked (NOT deleted)
        existing.revokedAt = new Date();

        // Create replacement token in the same family
        const entity = new RefreshTokenEntity({
          id: `token-id-${Date.now()}`,
          token: newData.token!,
          userId: newData.userId!,
          expiresAt: newData.expiresAt!,
          createdAt: new Date(),
          familyId: newData.familyId!,
          revokedAt: null,
        });
        dbTokens.set(newData.token!, entity);
        return Promise.resolve(true);
      });
      refreshTokenRepository.revokeFamily.mockImplementation((familyId) => {
        for (const token of dbTokens.values()) {
          if (token.familyId === familyId) {
            token.revokedAt = new Date();
          }
        }
        return Promise.resolve();
      });

      // Step 1: Normal refresh with Token A → produces Token B
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
      const firstRefreshResult = await useCase.execute({
        refresh_token: rawRefreshJwtA,
      });

      expect(firstRefreshResult.refresh_token).toBe(rawRefreshJwtB);

      // TEST 3: Old token A remains persisted in DB, but is marked revoked!
      // Replacement token B is persisted and is active!
      const hashB = refreshTokenHashingService.hash(rawRefreshJwtB);
      expect(dbTokens.has(hashA)).toBe(true);
      expect(dbTokens.get(hashA)?.revokedAt).not.toBeNull();
      expect(dbTokens.has(hashB)).toBe(true);
      expect(dbTokens.get(hashB)?.revokedAt).toBeNull();
      expect(dbTokens.get(hashB)?.familyId).toBe('family-F1');

      // Step 2: Attacker replays consumed Token A (REUSE DETECTION!)
      // Must fail with 401 AND revoke the entire family F1!
      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'family-F1',
      );

      // Verify that Token B in the database is now revoked!
      expect(dbTokens.get(hashB)?.revokedAt).not.toBeNull();

      // Step 3: Legitimate client attempts to use Token B
      // Must FAIL with 401 because its family was revoked due to Token A reuse!
      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtB }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );
    });
  });

  describe('Step 9.4: Account Status Enforcement in RefreshUseCase', () => {
    const validRefreshToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.valid';
    const tokenHash = 'test-token-hash-step94';

    beforeEach(() => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
      jest.spyOn(refreshTokenHashingService, 'hash').mockReturnValue(tokenHash);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-94',
          token: tokenHash,
          userId: 'user-uuid-123',
          familyId: 'family-94',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        }),
      );

      refreshTokenRepository.rotate.mockResolvedValue(true);
    });

    it('ALLOWS token refresh when user is active and not blocked', async () => {
      userRepository.findById.mockResolvedValue(
        new UserEntities({
          id: 'user-uuid-123',
          email: 'worker@gigly.com',
          role: Role.WORKER,
          firstName: 'Alex',
          lastName: 'Johnson',
          isActive: true,
          isBlocked: false,
          createdAt: new Date(),
        }),
      );

      const result = await useCase.execute({
        refresh_token: validRefreshToken,
      });
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(refreshTokenRepository.rotate).toHaveBeenCalled();
    });

    it('DENIES token refresh (401) when user is BLOCKED (isBlocked === true)', async () => {
      userRepository.findById.mockResolvedValue(
        new UserEntities({
          id: 'user-uuid-123',
          email: 'worker@gigly.com',
          role: Role.WORKER,
          firstName: 'Alex',
          lastName: 'Johnson',
          isActive: true,
          isBlocked: true,
          createdAt: new Date(),
        }),
      );

      await expect(
        useCase.execute({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('DENIES token refresh (401) when user is INACTIVE (isActive === false)', async () => {
      userRepository.findById.mockResolvedValue(
        new UserEntities({
          id: 'user-uuid-123',
          email: 'worker@gigly.com',
          role: Role.WORKER,
          firstName: 'Alex',
          lastName: 'Johnson',
          isActive: false,
          isBlocked: false,
          createdAt: new Date(),
        }),
      );

      await expect(
        useCase.execute({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });
});
