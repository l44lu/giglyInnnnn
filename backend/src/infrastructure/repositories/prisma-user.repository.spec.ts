import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntities } from '../../domain/entities/user.entities';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUserRecord = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    passwordHash: 'hashed-password-123',
    role: 'WORKER' as const,
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    avatarUrl: null,
    location: null,
    bio: null,
    isVerified: true,
    isBlocked: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaUserRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('queries database by email and maps to UserEntities', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserRecord,
      );

      const result = await repository.findByEmail('user@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(result).toBeInstanceOf(UserEntities);
      expect(result?.id).toBe('user-uuid-1');
      expect(result?.email).toBe('user@example.com');
      expect(result?.passWordHash).toBe('hashed-password-123');
      expect(result?.isActive).toBe(true);
      expect(result?.isBlocked).toBe(false);
      expect(result?.canAuthenticate()).toBe(true);
    });

    it('accurately maps blocked and inactive user records', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        isActive: false,
        isBlocked: true,
      });

      const result = await repository.findByEmail('blocked@example.com');

      expect(result?.isActive).toBe(false);
      expect(result?.isBlocked).toBe(true);
      expect(result?.canAuthenticate()).toBe(false);
    });

    it('returns null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('updates passwordHash for user in database', async () => {
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        passwordHash: 'new-hashed-password-456',
      });

      await repository.updatePassword('user-uuid-1', 'new-hashed-password-456');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { passwordHash: 'new-hashed-password-456' },
      });
    });
  });
});
