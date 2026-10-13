import { Test, TestingModule } from '@nestjs/testing';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { Prisma } from '@prisma/client';

describe('PrismaRefreshTokenRepository', () => {
  let repository: PrismaRefreshTokenRepository;
  let prismaService: {
    refreshToken: {
      findUnique: jest.Mock;
      delete: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleTokenHash =
    'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';

  const mockDbRecord = {
    id: 'token-uuid-1',
    tokenHash: sampleTokenHash,
    userId: 'user-uuid-1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    createdAt: new Date(),
    sessionId: 'session-uuid-1',
    revokedAt: null,
    revokedReason: null,
  };

  beforeEach(async () => {
    prismaService = {
      refreshToken: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaRefreshTokenRepository,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    repository = module.get<PrismaRefreshTokenRepository>(
      PrismaRefreshTokenRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByTokenHash', () => {
    it('queries database by token hash and maps to RefreshTokenEntity', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockDbRecord);

      const result = await repository.findByTokenHash(sampleTokenHash);

      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sampleTokenHash },
      });
      expect(result).toBeInstanceOf(RefreshTokenEntity);
      expect(result?.tokenHash).toBe(sampleTokenHash);
      expect(result?.sessionId).toBe('session-uuid-1');
      expect(result?.revokedAt).toBeNull();
      expect(result?.revokedReason).toBeNull();
    });

    it('returns null if record is not found', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      const result = await repository.findByTokenHash(
        'non-existent-token-hash',
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteByTokenHash', () => {
    it('deletes token by hash and returns true when record exists', async () => {
      prismaService.refreshToken.delete.mockResolvedValue(mockDbRecord);

      const result = await repository.deleteByTokenHash(sampleTokenHash);

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { tokenHash: sampleTokenHash },
      });
      expect(result).toBe(true);
    });

    it('returns false when record does not exist (Prisma P2025)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        { code: 'P2025', clientVersion: '5.x' },
      );
      prismaService.refreshToken.delete.mockRejectedValue(p2025Error);

      const result = await repository.deleteByTokenHash(sampleTokenHash);

      expect(result).toBe(false);
    });

    it('rethrows unexpected database errors instead of returning false', async () => {
      const unexpectedError = new Error('Database connection failure');
      prismaService.refreshToken.delete.mockRejectedValue(unexpectedError);

      await expect(
        repository.deleteByTokenHash(sampleTokenHash),
      ).rejects.toThrow('Database connection failure');
    });
  });

  describe('create', () => {
    it('saves the token hash into the database with sessionId and nullable revokedReason', async () => {
      prismaService.refreshToken.create.mockResolvedValue(mockDbRecord);

      const result = await repository.create({
        tokenHash: sampleTokenHash,
        userId: 'user-uuid-1',
        expiresAt: mockDbRecord.expiresAt,
        sessionId: 'session-uuid-1',
      });

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: sampleTokenHash,
          userId: 'user-uuid-1',
          expiresAt: mockDbRecord.expiresAt,
          sessionId: 'session-uuid-1',
          revokedAt: null,
          revokedReason: null,
        },
      });
      expect(result).toBeInstanceOf(RefreshTokenEntity);
      expect(result.tokenHash).toBe(sampleTokenHash);
      expect(result.sessionId).toBe('session-uuid-1');
      expect(result.revokedAt).toBeNull();
      expect(result.revokedReason).toBeNull();
    });
  });

  describe('rotate (atomic rotation via interactive $transaction)', () => {
    const newTokenHash =
      'b691a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146f';
    const newTokenData = {
      tokenHash: newTokenHash,
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      sessionId: 'session-uuid-1',
    };

    it('TEST 1: atomically marks old active token as revoked with ROTATED reason and creates exactly one replacement token in the same session', async () => {
      const callOrder: string[] = [];
      const mockTx = {
        refreshToken: {
          updateMany: jest.fn().mockImplementation(() => {
            callOrder.push('updateMany');
            return Promise.resolve({ count: 1 });
          }),
          create: jest.fn().mockImplementation(() => {
            callOrder.push('create');
            return Promise.resolve({
              id: 'token-uuid-2',
              tokenHash: newTokenHash,
              userId: 'user-uuid-1',
              expiresAt: newTokenData.expiresAt,
              createdAt: new Date(),
              sessionId: 'session-uuid-1',
              revokedAt: null,
              revokedReason: null,
            });
          }),
        },
      };

      prismaService.$transaction.mockImplementation(
        (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      const result = await repository.rotate(sampleTokenHash, newTokenData);

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      // Execution order invariant: updateMany must be called before create
      expect(callOrder).toEqual(['updateMany', 'create']);

      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'ROTATED' },
      });
      expect(mockTx.refreshToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: newTokenHash,
          userId: 'user-uuid-1',
          expiresAt: newTokenData.expiresAt,
          sessionId: 'session-uuid-1',
          revokedAt: null,
          revokedReason: null,
        },
      });
      expect(result).toBe(true);
    });

    it('TEST 2: when conditional update affects zero rows (already revoked or non-existent), does NOT insert replacement token and returns false', async () => {
      const mockTx = {
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn(),
        },
      };

      prismaService.$transaction.mockImplementation(
        (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      const result = await repository.rotate(sampleTokenHash, newTokenData);

      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'ROTATED' },
      });
      // Critical invariant: replacement token must NEVER be inserted when old token was not revoked
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

      prismaService.$transaction.mockImplementation(
        (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(
        repository.rotate(sampleTokenHash, newTokenData),
      ).rejects.toThrow('Unique constraint violation or DB error');

      expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sampleTokenHash, revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'ROTATED' },
      });
      expect(mockTx.refreshToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: newTokenHash,
          userId: 'user-uuid-1',
          expiresAt: newTokenData.expiresAt,
          sessionId: 'session-uuid-1',
          revokedAt: null,
          revokedReason: null,
        },
      });
    });
  });

  describe('revokeSession', () => {
    it('updates all active tokens in the session setting revokedAt timestamp and reason', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({
        count: 3,
      });

      await repository.revokeSession('session-uuid-1', 'LOGOUT');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-uuid-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'LOGOUT',
        },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('updates all active tokens for the user setting revokedAt timestamp and reason', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({
        count: 4,
      });

      await repository.revokeAllForUser('user-uuid-1', 'PASSWORD_RESET');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'PASSWORD_RESET',
        },
      });
    });
  });
});
