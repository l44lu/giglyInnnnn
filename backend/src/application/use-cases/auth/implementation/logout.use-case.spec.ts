import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LogoutUseCase } from './logout.use-case';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import {
  ITokenService,
  InvalidTokenError,
} from '../../../../domain/services/token.service.interface';
import { RefreshTokenHashingService } from '../../../../infrastructure/crypto/refresh-token-hashing.service';
import { RefreshTokenEntity } from '../../../../domain/entities/refresh-token.entity';

describe('LogoutUseCase — Server-Side Refresh Family Revocation (9C-5)', () => {
  let useCase: LogoutUseCase;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let refreshTokenHashingService: IRefreshTokenHashingService;
  let tokenService: jest.Mocked<ITokenService>;

  const userId = 'user-uuid-123';
  const otherUserId = 'user-uuid-456';
  const rawRefreshJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.refresh.jwt';
  const familyId = 'family-uuid-abc';

  beforeEach(() => {
    refreshTokenRepository = {
      findByTokenHash: jest.fn(),
      deleteByTokenHash: jest.fn(),
      rotate: jest.fn(),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokenRepository>;

    refreshTokenHashingService = new RefreshTokenHashingService();

    tokenService = {
      verifyRefreshToken: jest.fn().mockResolvedValue({ sub: userId }),
      verifyAccessToken: jest.fn(),
      issueAccessToken: jest.fn(),
      issueRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<ITokenService>;

    useCase = new LogoutUseCase(
      refreshTokenRepository,
      refreshTokenHashingService,
      tokenService,
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

      expect(tokenService.verifyRefreshToken).not.toHaveBeenCalled();
      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
    });

    it('2. Invalid or tampered JWT signature throws 401 and does NOT revoke any family', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(
        new InvalidTokenError('invalid signature error'),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });
  });

  describe('Database Hash Lookup, Ownership & Revocation', () => {
    it('3. Successfully revokes the correct token family and returns success message', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: familyId,
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

      // Exactly the target session was revoked
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        familyId,
        'LOGOUT',
      );

      // No new tokens were generated or persisted
      expect(tokenService.issueAccessToken).not.toHaveBeenCalled();
      expect(tokenService.issueRefreshToken).not.toHaveBeenCalled();
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

      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });

    it('5. Cross-user token: Token belonging to another user throws 401 and does NOT revoke', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId: otherUserId, // Different user!
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: 'other-user-family',
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });

    it('6. Token payload sub mismatch throws 401 and does NOT revoke', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: otherUserId,
      });

      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);
      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: familyId,
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });

    it('7. DB-expired token throws 401 and does NOT revoke any family', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId,
          expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 min ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
          sessionId: familyId,
          revokedAt: null,
        }),
      );

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or revoked refresh token'),
      );

      expect(refreshTokenRepository.revokeSession).not.toHaveBeenCalled();
    });

    it('8. Already-revoked refresh token revokes session safely without resurrecting or issuing tokens', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: familyId,
          revokedAt: new Date(Date.now() - 1000 * 60 * 5), // Already revoked!
        }),
      );

      const result = await useCase.execute(userId, {
        refresh_token: rawRefreshJwt,
      });

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        familyId,
        'LOGOUT',
      );
      expect(refreshTokenRepository.create).not.toHaveBeenCalled();
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });

    it('9. Unexpected database failure during revokeSession propagates naturally without conversion to 401', async () => {
      const tokenHash = refreshTokenHashingService.hash(rawRefreshJwt);

      refreshTokenRepository.findByTokenHash.mockResolvedValue(
        new RefreshTokenEntity({
          id: 'token-id-1',
          tokenHash,
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          sessionId: familyId,
          revokedAt: null,
        }),
      );

      const dbCrashError = new Error('Database connection pool exhausted');
      refreshTokenRepository.revokeSession.mockRejectedValue(dbCrashError);

      await expect(
        useCase.execute(userId, { refresh_token: rawRefreshJwt }),
      ).rejects.toThrow('Database connection pool exhausted');
    });
  });
});
