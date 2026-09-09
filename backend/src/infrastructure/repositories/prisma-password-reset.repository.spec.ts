import { PrismaPasswordResetRepository } from './prisma-password-reset.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetEntity } from '../../domain/entities/password-reset.entity';

describe('PrismaPasswordResetRepository', () => {
  let repository: PrismaPasswordResetRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDbRecord = {
    id: 'reset-uuid-1',
    userId: 'user-uuid-1',
    otpHash: 'mocked-hmac-otp-hash',
    tokenHash: 'mocked-sha256-token-hash',
    attempts: 0,
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    createdAt: new Date(),
  };

  beforeEach(() => {
    prismaService = {
      passwordReset: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaPasswordResetRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserId', () => {
    it('queries database for most recent reset request by userId and maps to entity', async () => {
      (prismaService.passwordReset.findFirst as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByUserId('user-uuid-1');

      expect(prismaService.passwordReset.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBeInstanceOf(PasswordResetEntity);
      expect(result?.id).toBe('reset-uuid-1');
      expect(result?.userId).toBe('user-uuid-1');
      expect(result?.otpHash).toBe('mocked-hmac-otp-hash');
      expect(result?.tokenHash).toBe('mocked-sha256-token-hash');
    });

    it('returns null when no record is found', async () => {
      (prismaService.passwordReset.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByUserId('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('findByTokenHash', () => {
    it('queries database by tokenHash and maps to entity', async () => {
      (prismaService.passwordReset.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByTokenHash(
        'mocked-sha256-token-hash',
      );

      expect(prismaService.passwordReset.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'mocked-sha256-token-hash' },
      });
      expect(result).toBeInstanceOf(PasswordResetEntity);
      expect(result?.id).toBe('reset-uuid-1');
      expect(result?.tokenHash).toBe('mocked-sha256-token-hash');
    });

    it('returns null when tokenHash does not exist', async () => {
      (prismaService.passwordReset.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByTokenHash('invalid-hash');

      expect(result).toBeNull();
    });
  });

  describe('updateAttempts', () => {
    it('updates attempt count for given reset record', async () => {
      (prismaService.passwordReset.update as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        attempts: 2,
      });

      await repository.updateAttempts('reset-uuid-1', 2);

      expect(prismaService.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'reset-uuid-1' },
        data: { attempts: 2 },
      });
    });
  });

  describe('setTokenHash', () => {
    it('updates tokenHash when OTP verification succeeds', async () => {
      (prismaService.passwordReset.update as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        tokenHash: 'new-auth-token-hash',
      });

      await repository.setTokenHash('reset-uuid-1', 'new-auth-token-hash');

      expect(prismaService.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'reset-uuid-1' },
        data: { tokenHash: 'new-auth-token-hash' },
      });
    });
  });

  describe('consumeOtpAndSetTokenHash', () => {
    it('atomically sets tokenHash and optional expiresAt when tokenHash is currently null', async () => {
      (prismaService.passwordReset.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const result = await repository.consumeOtpAndSetTokenHash(
        'reset-uuid-1',
        'new-auth-token-hash',
        newExpiresAt,
      );

      expect(prismaService.passwordReset.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'reset-uuid-1',
          tokenHash: null,
        },
        data: {
          tokenHash: 'new-auth-token-hash',
          expiresAt: newExpiresAt,
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when record does not exist or tokenHash is already set', async () => {
      (prismaService.passwordReset.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await repository.consumeOtpAndSetTokenHash(
        'reset-uuid-1',
        'new-auth-token-hash',
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    it('deletes all reset requests for the specified user', async () => {
      (prismaService.passwordReset.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await repository.deleteByUserId('user-uuid-1');

      expect(prismaService.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
    });
  });

  describe('create', () => {
    it('creates a new password reset record in the database', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
      (prismaService.passwordReset.create as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        tokenHash: null,
      });

      const result = await repository.create({
        userId: 'user-uuid-1',
        otpHash: 'mocked-hmac-otp-hash',
        expiresAt,
      });

      expect(prismaService.passwordReset.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          otpHash: 'mocked-hmac-otp-hash',
          tokenHash: null,
          attempts: 0,
          expiresAt,
        },
      });
      expect(result).toBeInstanceOf(PasswordResetEntity);
      expect(result.tokenHash).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes record by id through base repository', async () => {
      (prismaService.passwordReset.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.delete('reset-uuid-1');

      expect(prismaService.passwordReset.delete).toHaveBeenCalledWith({
        where: { id: 'reset-uuid-1' },
      });
      expect(result).toBe(true);
    });
  });
});
