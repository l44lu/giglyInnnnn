import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogoutUseCase } from './logout.use-case';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { RefreshTokenHashingService } from '../../../../infrastructure/crypto/refresh-token-hashing.service';
import { RefreshTokenEntity } from '../../../../domain/entities/refresh-token.entity';

describe('LogoutUseCase — Server-Side Refresh Family Revocation (9C-5)', () => {
  let useCase: LogoutUseCase;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let refreshTokenHashingService: IRefreshTokenHashingService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const userId = 'user-uuid-123';
  const otherUserId = 'user-uuid-456';
  const rawRefreshJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.refresh.jwt';
  const familyId = 'family-uuid-abc';

  beforeEach(() => {
    refreshTokenRepository = {
      findByToken: jest.fn(),
      findByTokenHash: jest.fn(),
      deleteByTokenHash: jest.fn(),
      rotate: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokenRepository>;

    refreshTokenHashingService = new RefreshTokenHashingService();

    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: userId }),
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new LogoutUseCase(
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
    it('1. Missing or empty refresh token throws BadRequestException', async () => {
      await expect(
        useCase.execute(userId, { refresh_token: '' }),
      ).rejects.toThrow(new BadRequestException('Refresh token is required'));

      await expect(
        useCase.execute(userId, null as unknown as { refresh_token: string }),
      ).rejects.toThrow(new BadRequestException('Refresh token is required'));

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
    });

    it('2. Invalid or tampered JWT signature throws 401 and does NOT revoke any family', async () => {
      jwtService.verifyAsync.mockRejectedValue(
        new Error('invalid signature error'),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });
  });

  describe('Database Hash Lookup, Ownership & Revocation', () => {
    it('3. Successfully revokes the correct token family and returns success message', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId,
          revokedAt: null,
        }),
      );

      const result = await useCase.execute(userId, {
        refresh_token: rawRefreshJwt,
      });

      expect(result).toEqual({ message: 'Logged out successfully' });

      // Looked up using deterministic SHA-256 hash (never raw token)
      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        tokenHash,
      );

      // Exactly the target family was revoked
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        familyId,
      );

      // No new tokens were generated or persisted
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('4. Unknown refresh token throws 401 and does NOT revoke any family', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('5. Cross-user token: Token belonging to another user throws 401 and does NOT revoke', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId: otherUserId, // Different user!
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId: 'other-user-family',
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('6. Token payload sub mismatch throws 401 and does NOT revoke', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: otherUserId });

      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId,
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('7. DB-expired token throws 401 and does NOT revoke any family', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId,
          expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 min ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
          familyId,
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('8. Already-revoked refresh token revokes family safely without resurrecting or issuing tokens', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId,
          revokedAt: new Date(Date.now() - 1000 * 60 * 5), // Already revoked!
        }),
      );

      const result = await useCase.execute(userId, {
        refresh_token: rawRefreshJwt,
      });

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        familyId,
      );
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('9. Unexpected database failure during revokeFamily propagates naturally without conversion to 401', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          token: tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          familyId,
          revokedAt: null,
        }),
      );

      const dbCrashError = new Error('Database connection pool exhausted');
      refreshTokenRepository.revokeFamily.mockRejectedValue(dbCrashError);

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow('Database connection pool exhausted');
    });
  });
});
