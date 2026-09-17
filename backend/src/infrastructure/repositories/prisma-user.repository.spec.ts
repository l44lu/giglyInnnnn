import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntities } from '../../domain/entities/user.entities';
import { Role } from '../../domain/enums/role.enum';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const createMockUserRecord = (roleCode: string) => ({
    id: 'user-uuid-1',
    email: 'user@example.com',
    passwordHash: 'hashed-password-123',
    roleId: `role-uuid-${roleCode.toLowerCase()}`,
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
    role: {
      id: `role-uuid-${roleCode.toLowerCase()}`,
      code: roleCode,
      name: roleCode,
      description: `${roleCode} role`,
      isSystem: true,
      isActive: true,
      isAssignableOnRegistration: roleCode !== 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const mockUserRecord = createMockUserRecord('WORKER');

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
    it('queries database by email with role relation and maps to UserEntities', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserRecord,
      );

      const result = await repository.findByEmail('user@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        include: { role: true },
      });
      expect(result).toBeInstanceOf(UserEntities);
      expect(result?.id).toBe('user-uuid-1');
      expect(result?.email).toBe('user@example.com');
      expect(result?.role).toBe(Role.WORKER);
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

    it('throws error when user has no role relation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        role: null,
      });

      await expect(
        repository.findByEmail('norole@example.com'),
      ).rejects.toThrow('User user-uuid-1 has no associated role or role code');
    });
  });

  describe('findById', () => {
    it('queries database by id with role relation and maps correctly', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        createMockUserRecord('ADMIN'),
      );

      const result = await repository.findById('user-uuid-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        include: { role: true },
      });
      expect(result).toBeInstanceOf(UserEntities);
      expect(result?.role).toBe(Role.ADMIN);
    });

    it('returns null when user not found by id', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('missing-uuid');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('queries all users with role relation and maps correctly', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        createMockUserRecord('WORKER'),
        createMockUserRecord('RECRUITER'),
      ]);

      const results = await repository.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        include: { role: true },
      });
      expect(results).toHaveLength(2);
      expect(results[0].role).toBe(Role.WORKER);
      expect(results[1].role).toBe(Role.RECRUITER);
    });
  });

  describe('create', () => {
    it('creates user with ADMIN role by connecting role code', async () => {
      const adminRecord = createMockUserRecord('ADMIN');
      (prismaService.user.create as jest.Mock).mockResolvedValue(adminRecord);

      const result = await repository.create({
        email: 'admin@example.com',
        passWordHash: 'hashed-admin',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          passwordHash: 'hashed-admin',
          firstName: 'Admin',
          lastName: 'User',
          role: {
            connect: { code: Role.ADMIN },
          },
          isActive: true,
          isBlocked: false,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('creates user with WORKER role by connecting role code', async () => {
      const workerRecord = createMockUserRecord('WORKER');
      (prismaService.user.create as jest.Mock).mockResolvedValue(workerRecord);

      const result = await repository.create({
        email: 'worker@example.com',
        passWordHash: 'hashed-worker',
        firstName: 'Worker',
        lastName: 'User',
        role: Role.WORKER,
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'worker@example.com',
          passwordHash: 'hashed-worker',
          firstName: 'Worker',
          lastName: 'User',
          role: {
            connect: { code: Role.WORKER },
          },
          isActive: true,
          isBlocked: false,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.WORKER);
    });

    it('creates user with RECRUITER role by connecting role code', async () => {
      const recruiterRecord = createMockUserRecord('RECRUITER');
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        recruiterRecord,
      );

      const result = await repository.create({
        email: 'recruiter@example.com',
        passWordHash: 'hashed-recruiter',
        firstName: 'Recruiter',
        lastName: 'User',
        role: Role.RECRUITER,
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'recruiter@example.com',
          passwordHash: 'hashed-recruiter',
          firstName: 'Recruiter',
          lastName: 'User',
          role: {
            connect: { code: Role.RECRUITER },
          },
          isActive: true,
          isBlocked: false,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.RECRUITER);
    });

    it('defaults to WORKER role if role is not provided on creation', async () => {
      const workerRecord = createMockUserRecord('WORKER');
      (prismaService.user.create as jest.Mock).mockResolvedValue(workerRecord);

      const result = await repository.create({
        email: 'default@example.com',
        passWordHash: 'hashed-default',
        firstName: 'Default',
        lastName: 'User',
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'default@example.com',
          passwordHash: 'hashed-default',
          firstName: 'Default',
          lastName: 'User',
          role: {
            connect: { code: Role.WORKER },
          },
          isActive: true,
          isBlocked: false,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.WORKER);
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
