import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAuthorizationRepository } from './prisma-authorization.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('PrismaAuthorizationRepository', () => {
  let repository: PrismaAuthorizationRepository;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAuthorizationRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaAuthorizationRepository>(
      PrismaAuthorizationRepository,
    );
  });

  describe('getActiveRoleCodes', () => {
    it('should return ADMIN role for an active ADMIN user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: { code: 'ADMIN', isActive: true },
      });

      const roles = await repository.getActiveRoleCodes('admin-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        select: {
          role: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      });
      expect(roles).toEqual(['ADMIN']);
    });

    it('should return WORKER role for an active WORKER user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: { code: 'WORKER', isActive: true },
      });

      const roles = await repository.getActiveRoleCodes('worker-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
        select: {
          role: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      });
      expect(roles).toEqual(['WORKER']);
    });

    it('should return RECRUITER role for an active RECRUITER user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: { code: 'RECRUITER', isActive: true },
      });

      const roles = await repository.getActiveRoleCodes('recruiter-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'recruiter-1' },
        select: {
          role: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      });
      expect(roles).toEqual(['RECRUITER']);
    });

    it('should return empty array if role is inactive (isActive: false)', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: { code: 'ADMIN', isActive: false },
      });

      const roles = await repository.getActiveRoleCodes('inactive-user');
      expect(roles).toEqual([]);
    });

    it('should return empty array if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const roles = await repository.getActiveRoleCodes('nonexistent-user');
      expect(roles).toEqual([]);
    });

    it('should return empty array if user has no role relation', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: null,
      });

      const roles = await repository.getActiveRoleCodes('user-no-role');
      expect(roles).toEqual([]);
    });

    it('should propagate database errors when querying roles', async () => {
      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(repository.getActiveRoleCodes('user-1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getActivePermissionCodes', () => {
    it('should return permissions for a user with an active role', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: {
          isActive: true,
          rolePermissions: [
            { permission: { code: 'jobs:view' } },
            { permission: { code: 'applications:apply' } },
          ],
        },
      });

      const permissions = await repository.getActivePermissionCodes('worker-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
        select: {
          role: {
            select: {
              isActive: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      expect(permissions).toEqual(['jobs:view', 'applications:apply']);
    });

    it('should deduplicate permissions if role has duplicate permission mappings', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: {
          isActive: true,
          rolePermissions: [
            { permission: { code: 'jobs:view' } },
            { permission: { code: 'jobs:view' } },
            { permission: { code: 'jobs:create' } },
          ],
        },
      });

      const permissions =
        await repository.getActivePermissionCodes('multi-perm-user');

      expect(permissions).toHaveLength(2);
      expect(permissions).toEqual(
        expect.arrayContaining(['jobs:view', 'jobs:create']),
      );
    });

    it('should return empty array if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const permissions =
        await repository.getActivePermissionCodes('user-empty');
      expect(permissions).toEqual([]);
    });

    it('should return empty array if user role is inactive (isActive: false)', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: {
          isActive: false,
          rolePermissions: [{ permission: { code: 'jobs:view' } }],
        },
      });

      const permissions =
        await repository.getActivePermissionCodes('user-inactive-role');
      expect(permissions).toEqual([]);
    });

    it('should return empty array if user role has no permissions mapped', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: {
          isActive: true,
          rolePermissions: [],
        },
      });

      const permissions =
        await repository.getActivePermissionCodes('user-empty-role');
      expect(permissions).toEqual([]);
    });

    it('should return empty array if user has no role relation', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        role: null,
      });

      const permissions =
        await repository.getActivePermissionCodes('user-no-role');
      expect(permissions).toEqual([]);
    });

    it('should propagate database errors (fail-closed)', async () => {
      prismaService.user.findUnique.mockRejectedValue(
        new Error('PostgreSQL connection dropped'),
      );

      await expect(
        repository.getActivePermissionCodes('user-fail'),
      ).rejects.toThrow('PostgreSQL connection dropped');
    });
  });
});
