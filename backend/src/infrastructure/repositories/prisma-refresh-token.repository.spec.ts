import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { Prisma } from '@prisma/client';

describe('PrismaRefreshTokenRepository', () => {
  let repository: PrismaRefreshTokenRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const sampleTokenHash =
    'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';

  const mockDbRecord = {
    id: 'token-uuid-1',
    token: sampleTokenHash,
    userId: 'user-uuid-1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    createdAt: new Date(),
    familyId: 'family-uuid-1',
    revokedAt: null,
  };

  beforeEach(() => {
    prismaService = {
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaRefreshTokenRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByTokenHash', () => {
    it('queries database by token hash and maps to RefreshTokenEntity', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByTokenHash(sampleTokenHash);

      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: sampleTokenHash },
      });
      expect(result).toBeInstanceOf(RefreshTokenEntity);
      expect(result?.id).toBe('token-uuid-1');
      expect(result?.token).toBe(sampleTokenHash);
      expect(result?.userId).toBe('user-uuid-1');
      expect(result?.familyId).toBe('family-uuid-1');
      expect(result?.revokedAt).toBeNull();
    });

    it('returns null if record is not found', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByTokenHash(
        'non-existent-token-hash',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByToken alias', () => {
    it('delegates to findByTokenHash for backwards compatibility', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByToken(sampleTokenHash);

      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: sampleTokenHash },
      });
      expect(result).toBeInstanceOf(RefreshTokenEntity);
    });
  });

  describe('deleteByTokenHash', () => {
    it('deletes token by hash and returns true when record exists', async () => {
      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.deleteByTokenHash(sampleTokenHash);

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: sampleTokenHash },
      });
      expect(result).toBe(true);
    });

    it('returns false when record does not exist (Prisma P2025)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        { code: 'P2025', clientVersion: '5.x' },
      );
      (prismaService.refreshToken.delete as jest.Mock).mockRejectedValue(
        p2025Error,
      );

      const result = await repository.deleteByTokenHash(sampleTokenHash);

      expect(result).toBe(false);
    });

    it('rethrows unexpected database errors instead of returning false', async () => {
      const unexpectedError = new Error('Database connection failure');
      (prismaService.refreshToken.delete as jest.Mock).mockRejectedValue(
        unexpectedError,
      );

      await expect(
        repository.deleteByTokenHash(sampleTokenHash),
      ).rejects.toThrow('Database connection failure');
    });

    it('deleteByToken alias delegates to deleteByTokenHash', async () => {
      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.deleteByToken(sampleTokenHash);

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: sampleTokenHash },
      });
      expect(result).toBe(true);
    });
  });

  describe('create', () => {
    it('saves the token hash into the database with familyId', async () => {
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.create({
        token: sampleTokenHash,
        userId: 'user-uuid-1',
        expiresAt: mockDbRecord.expiresAt,
        familyId: 'family-uuid-1',
      });

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: sampleTokenHash,
          userId: 'user-uuid-1',
          expiresAt: mockDbRecord.expiresAt,
          familyId: 'family-uuid-1',
          revokedAt: null,
        },
      });
      expect(result).toBeInstanceOf(RefreshTokenEntity);
      expect(result.token).toBe(sampleTokenHash);
      expect(result.familyId).toBe('family-uuid-1');
      expect(result.revokedAt).toBeNull();
    });
  });

  describe('rotate (atomic rotation via $transaction)', () => {
    const newTokenHash =
      'b691a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146f';
    const newTokenData = {
      token: newTokenHash,
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      familyId: 'family-uuid-1',
    };

    it('TEST 1: atomically marks old token as revoked and creates new token in the same family', async () => {
      const mockTx = {
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'token-uuid-2',
            token: newTokenHash,
            userId: 'user-uuid-1',
            expiresAt: newTokenData.expiresAt,
            createdAt: new Date(),
            familyId: 'family-uuid-1',
            revokedAt: null,
          }),
        },
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      const result = await repository.rotate(sampleTokenHash, newTokenData);

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockTx.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: newTokenHash,
          userId: 'user-uuid-1',
          expiresAt: newTokenData.expiresAt,
          familyId: 'family-uuid-1',
          revokedAt: null,
        },
      });
      expect(result).toBe(true);
    });

    it('TEST 2: returns false if old token is not active / already revoked (count: 0) without creating new token', async () => {
      const mockTx = {
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn(),
        },
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      const result = await repository.rotate(sampleTokenHash, newTokenData);

      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockTx.refreshToken.create).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('TEST 3: propagates error when create fails inside transaction, allowing Prisma rollback', async () => {
      const createError = new Error('Unique constraint violation or DB error');
      const mockTx = {
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockRejectedValue(createError),
        },
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(
        repository.rotate(sampleTokenHash, newTokenData),
      ).rejects.toThrow('Unique constraint violation or DB error');

      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockTx.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: newTokenHash,
          userId: 'user-uuid-1',
          expiresAt: newTokenData.expiresAt,
          familyId: 'family-uuid-1',
          revokedAt: null,
        },
      });
    });
  });

  describe('revokeFamily', () => {
    it('updates all active tokens in the family setting revokedAt timestamp', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      await repository.revokeFamily('family-uuid-1');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-uuid-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('updates all active tokens for the user setting revokedAt timestamp', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 4,
      });

      await repository.revokeAllForUser('user-uuid-1');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });
});
