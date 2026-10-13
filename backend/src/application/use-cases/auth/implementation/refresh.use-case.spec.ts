import { UnauthorizedException } from '@nestjs/common';
import { RefreshUseCase } from './refresh.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import {
  ITokenService,
  InvalidTokenError,
} from '../../../../domain/services/token.service.interface';
import { RefreshTokenHashingService } from '../../../../infrastructure/crypto/refresh-token-hashing.service';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';
import { RefreshTokenEntity } from '../../../../domain/entities/refresh-token.entity';

describe('RefreshUseCase — Token Rotation & Invalidation (9C-3)', () => {
  let useCase: RefreshUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let refreshTokenHashingService: IRefreshTokenHashingService;
  let tokenService: jest.Mocked<ITokenService>;

  const rawRefreshJwtA =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenA.refresh.mock';
  const rawRefreshJwtB =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenB.rotated.refresh.mock';
  const newAccessJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.access.token.mock';
  const mockTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
      findByTokenHash: jest.fn(),
      deleteByTokenHash: jest.fn().mockResolvedValue(true),
      rotate: jest.fn().mockResolvedValue(true),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokenRepository>;

    refreshTokenHashingService = new RefreshTokenHashingService();

    tokenService = {
      verifyRefreshToken: jest.fn().mockResolvedValue({
        sub: 'user-uuid-123',
      }),
      issueAccessToken: jest.fn().mockResolvedValue(newAccessJwt),
      issueRefreshToken: jest.fn().mockResolvedValue({
        token: rawRefreshJwtB,
        expiresAt: mockTokenExpiry,
      }),
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<ITokenService>;

    useCase = new RefreshUseCase(
      userRepository,
      refreshTokenRepository,
      refreshTokenHashingService,
      tokenService,
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

      expect(tokenService.verifyRefreshToken).not.toHaveBeenCalled();
      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
    });

    it('2 & 3. Invalid JWT / invalid signature → throws 401', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(
        new InvalidTokenError('invalid signature error'),
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

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-2',
          tokenHash: refreshTokenHashingService.hash(rawRefreshJwtB),
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
        }),
      );

      await useCase.execute({ refresh_token: rawRefreshJwtA });

      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        expectedHash,
      );
    });

    it('5. Token not found in DB → throws 401', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
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

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 minute ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
          sessionId: 'session-uuid-1',
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

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: expectedHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
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

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
          revokedAt: null,
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.rotate.mockResolvedValue(true);

      // 8. Valid refresh succeeds
      const result = await useCase.execute({
        refresh_token: rawRefreshJwtA,
      });

      // 9. New access token is returned
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
      expect(calledNewData.tokenHash).toBe(expectedNewHash);
      expect(calledNewData.tokenHash).toHaveLength(64);
      expect(calledNewData.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(calledNewData.userId).toBe('user-uuid-123');
      expect(calledNewData.expiresAt).toBe(mockTokenExpiry);
      // TEST 2: Rotation preserves the token session
      expect(calledNewData.sessionId).toBe('session-uuid-1');

      // 13. Raw new refresh token is returned to caller
      expect(result.refresh_token).toBe(rawRefreshJwtB);

      // 16. Hash of new raw refresh token matches the persisted hash
      expect(refreshTokenHashingService.hash(result.refresh_token!)).toBe(
        calledNewData.tokenHash,
      );

      // 17. The response does NOT expose the hash
      expect(result.refresh_token).not.toBe(calledNewData.tokenHash);
      expect(result.refresh_token!.startsWith('eyJ')).toBe(true);
      expect(result.refresh_token).not.toMatch(/^[0-9a-f]{64}$/);
    });

    it('rejects if old token was already consumed by a concurrent request', async () => {
      const oldTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
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

      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        'session-uuid-1',
        'REUSE_DETECTED',
      );
    });

    it('propagates unexpected database failure during rotation without converting to UnauthorizedException', async () => {
      const oldTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash: oldTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-uuid-1',
          revokedAt: null,
        }),
      );
      userRepository.findById.mockResolvedValue(mockUser);

      const dbCrashError = new Error('Database deadlock on update');
      refreshTokenRepository.rotate.mockRejectedValue(dbCrashError);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow('Database deadlock on update');
    });
  });

  describe('Refresh Token Reuse Detection & Session Revocation (9C-4)', () => {
    it('TEST 5: detects token reuse when already-revoked token is presented, revokes entire session, and returns 401', async () => {
      const consumedTokenHash = refreshTokenHashingService.hash(rawRefreshJwtA);

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-consumed',
          tokenHash: consumedTokenHash,
          userId: 'user-uuid-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(Date.now() - 1000 * 60 * 10),
          sessionId: 'compromised-session-123',
          revokedAt: new Date(Date.now() - 1000 * 60 * 5), // Already revoked!
        }),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      // Entire session is revoked
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        'compromised-session-123',
        'REUSE_DETECTED',
      );

      // No new tokens signed
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('TEST 8: unknown token rejected with 401 and does NOT revoke any session', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('TEST 9: tampered token rejected with 401 before database lookup, no session revoked', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(
        new InvalidTokenError('invalid signature error'),
      );

      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(UnauthorizedException);

      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });

    it('TEST 14: session isolation — revoking session S1 does not affect active tokens in session S2', async () => {
      // Simulate two sessions in simulated storage
      const dbTokens = new Map<string, RefreshTokenEntity>();

      const hashS1_A = refreshTokenHashingService.hash(rawRefreshJwtA);
      const hashS2_X = refreshTokenHashingService.hash(rawRefreshJwtB);

      // Session S1: Token A (consumed)
      dbTokens.set(
        hashS1_A,
        new RefreshTokenEntity({
          id: 'tok-s1-a',
          tokenHash: hashS1_A,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-S1',
          revokedAt: new Date(), // Revoked!
        }),
      );

      // Session S2: Token X (active)
      dbTokens.set(
        hashS2_X,
        new RefreshTokenEntity({
          id: 'tok-s2-x',
          tokenHash: hashS2_X,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-S2',
          revokedAt: null, // Active!
        }),
      );

      refreshTokenRepository.findByTokenHash.mockImplementation((hash) =>
        Promise.resolve(dbTokens.get(hash) ?? null),
      );
      refreshTokenRepository.revokeSession.mockImplementation((sessionId) => {
        for (const token of dbTokens.values()) {
          if (token.sessionId === sessionId) {
            token.revokedAt = new Date();
          }
        }
        return Promise.resolve();
      });

      // 1. Presenting revoked Token A from Session S1 triggers reuse detection
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: mockUser.id });
      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        'session-S1',
        'REUSE_DETECTED',
      );

      // 2. Session S1 is revoked, but Session S2 is completely unaffected!
      expect(dbTokens.get(hashS1_A)?.revokedAt).not.toBeNull();
      expect(dbTokens.get(hashS2_X)?.revokedAt).toBeNull(); // Remains ACTIVE!
    });
  });

  describe('Sequential Rotation & Reuse Detection Lifecycle (Token A → B → reuse A revokes B)', () => {
    it('proves rotated token A remains in DB as revoked, and presenting A again revokes session and invalidates B', async () => {
      const dbTokens = new Map<string, RefreshTokenEntity>();

      // Initial state: Token A created on login (Session S1, active)
      const hashA = refreshTokenHashingService.hash(rawRefreshJwtA);
      dbTokens.set(
        hashA,
        new RefreshTokenEntity({
          id: 'token-id-A',
          tokenHash: hashA,
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'session-S1',
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

        // Create replacement token in the same session
        const entity = new RefreshTokenEntity({
          id: `token-id-${Date.now()}`,
          tokenHash: newData.tokenHash,
          userId: newData.userId,
          expiresAt: newData.expiresAt,
          createdAt: new Date(),
          sessionId: newData.sessionId,
          revokedAt: null,
        });
        dbTokens.set(newData.tokenHash, entity);
        return Promise.resolve(true);
      });
      refreshTokenRepository.revokeSession.mockImplementation((sessionId) => {
        for (const token of dbTokens.values()) {
          if (token.sessionId === sessionId) {
            token.revokedAt = new Date();
          }
        }
        return Promise.resolve();
      });

      // Step 1: Normal refresh with Token A → produces Token B
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: mockUser.id });
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
      expect(dbTokens.get(hashB)?.sessionId).toBe('session-S1');

      // Step 2: Attacker replays consumed Token A (REUSE DETECTION!)
      // Must fail with 401 AND revoke the entire session S1!
      await expect(
        useCase.execute({ refresh_token: rawRefreshJwtA }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        'session-S1',
        'REUSE_DETECTED',
      );

      // Verify that Token B in the database is now revoked!
      expect(dbTokens.get(hashB)?.revokedAt).not.toBeNull();

      // Step 3: Legitimate client attempts to use Token B
      // Must FAIL with 401 because its session was revoked due to Token A reuse!
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
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-uuid-123',
      });
      jest.spyOn(refreshTokenHashingService, 'hash').mockReturnValue(tokenHash);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-94',
          tokenHash: tokenHash,
          userId: 'user-uuid-123',
          sessionId: 'session-94',
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
