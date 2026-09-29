import { PrismaRecruiterProfileRepository } from './prisma-recruiter-profile.repository';
import { PrismaService } from '../prisma/prisma.service';
import { RecruiterProfileEntity } from '../../domain/entities/recruiter-profile.entity';

describe('PrismaRecruiterProfileRepository', () => {
  let repository: PrismaRecruiterProfileRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDbRecord = {
    id: 'recruiter-profile-uuid-1',
    userId: 'user-uuid-1',
    companyId: 'company-uuid-1',
    roleTitle: 'Senior Talent Partner',
    yearsExperience: 7,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      recruiterProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaRecruiterProfileRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserId', () => {
    it('queries database by userId and maps to RecruiterProfileEntity', async () => {
      (
        prismaService.recruiterProfile.findUnique as jest.Mock
      ).mockResolvedValue(mockDbRecord);

      const result = await repository.findByUserId('user-uuid-1');

      expect(prismaService.recruiterProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result?.id).toBe('recruiter-profile-uuid-1');
      expect(result?.userId).toBe('user-uuid-1');
      expect(result?.companyId).toBe('company-uuid-1');
      expect(result?.roleTitle).toBe('Senior Talent Partner');
      expect(result?.yearsExperience).toBe(7);
      expect(result?.createdAt).toEqual(mockDbRecord.createdAt);
      expect(result?.updatedAt).toEqual(mockDbRecord.updatedAt);
    });

    it('returns null when no profile exists for userId', async () => {
      (
        prismaService.recruiterProfile.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await repository.findByUserId('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('creates recruiter profile when profile does not exist for userId', async () => {
      (prismaService.recruiterProfile.upsert as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.upsert('user-uuid-1', {
        companyId: 'company-uuid-1',
        roleTitle: 'Senior Talent Partner',
        yearsExperience: 7,
      });

      expect(prismaService.recruiterProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        create: {
          userId: 'user-uuid-1',
          companyId: 'company-uuid-1',
          roleTitle: 'Senior Talent Partner',
          yearsExperience: 7,
        },
        update: {
          companyId: 'company-uuid-1',
          roleTitle: 'Senior Talent Partner',
          yearsExperience: 7,
        },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result.id).toBe('recruiter-profile-uuid-1');
      expect(result.userId).toBe('user-uuid-1');
    });

    it('updates recruiter profile when profile already exists for userId', async () => {
      const updatedRecord = {
        ...mockDbRecord,
        roleTitle: 'Head of Talent',
        yearsExperience: 9,
      };
      (prismaService.recruiterProfile.upsert as jest.Mock).mockResolvedValue(
        updatedRecord,
      );

      const result = await repository.upsert('user-uuid-1', {
        roleTitle: 'Head of Talent',
        yearsExperience: 9,
      });

      expect(prismaService.recruiterProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        create: {
          userId: 'user-uuid-1',
          companyId: null,
          roleTitle: 'Head of Talent',
          yearsExperience: 9,
        },
        update: {
          roleTitle: 'Head of Talent',
          yearsExperience: 9,
        },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result.roleTitle).toBe('Head of Talent');
      expect(result.yearsExperience).toBe(9);
    });
  });

  describe('create', () => {
    it('creates a new recruiter profile and maps to RecruiterProfileEntity', async () => {
      (prismaService.recruiterProfile.create as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.create({
        userId: 'user-uuid-1',
        companyId: 'company-uuid-1',
        roleTitle: 'Senior Talent Partner',
        yearsExperience: 7,
      });

      expect(prismaService.recruiterProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          companyId: 'company-uuid-1',
          roleTitle: 'Senior Talent Partner',
          yearsExperience: 7,
        },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result.id).toBe('recruiter-profile-uuid-1');
      expect(result.userId).toBe('user-uuid-1');
    });

    it('creates profile with null values when optional fields are omitted', async () => {
      const recordWithNulls = {
        ...mockDbRecord,
        companyId: null,
        roleTitle: null,
        yearsExperience: null,
      };
      (prismaService.recruiterProfile.create as jest.Mock).mockResolvedValue(
        recordWithNulls,
      );

      const result = await repository.create({
        userId: 'user-uuid-1',
      });

      expect(prismaService.recruiterProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          companyId: null,
          roleTitle: null,
          yearsExperience: null,
        },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result.companyId).toBeNull();
      expect(result.roleTitle).toBeNull();
      expect(result.yearsExperience).toBeNull();
    });
  });

  describe('findById', () => {
    it('queries database by id and maps to RecruiterProfileEntity', async () => {
      (
        prismaService.recruiterProfile.findUnique as jest.Mock
      ).mockResolvedValue(mockDbRecord);

      const result = await repository.findById('recruiter-profile-uuid-1');

      expect(prismaService.recruiterProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'recruiter-profile-uuid-1' },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result?.id).toBe('recruiter-profile-uuid-1');
    });

    it('returns null when not found', async () => {
      (
        prismaService.recruiterProfile.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await repository.findById('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('queries all recruiter profiles and maps to RecruiterProfileEntity array', async () => {
      (prismaService.recruiterProfile.findMany as jest.Mock).mockResolvedValue([
        mockDbRecord,
      ]);

      const results = await repository.findAll();

      expect(prismaService.recruiterProfile.findMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(RecruiterProfileEntity);
    });
  });

  describe('update', () => {
    it('updates recruiter profile by id and maps to RecruiterProfileEntity', async () => {
      const updated = {
        ...mockDbRecord,
        roleTitle: 'Principal Recruiter',
      };
      (prismaService.recruiterProfile.update as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await repository.update('recruiter-profile-uuid-1', {
        roleTitle: 'Principal Recruiter',
      });

      expect(prismaService.recruiterProfile.update).toHaveBeenCalledWith({
        where: { id: 'recruiter-profile-uuid-1' },
        data: {
          roleTitle: 'Principal Recruiter',
        },
      });
      expect(result).toBeInstanceOf(RecruiterProfileEntity);
      expect(result.roleTitle).toBe('Principal Recruiter');
    });
  });

  describe('delete', () => {
    it('deletes recruiter profile by id and returns true on success', async () => {
      (prismaService.recruiterProfile.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.delete('recruiter-profile-uuid-1');

      expect(prismaService.recruiterProfile.delete).toHaveBeenCalledWith({
        where: { id: 'recruiter-profile-uuid-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when delete fails', async () => {
      (prismaService.recruiterProfile.delete as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await repository.delete('missing-id');

      expect(result).toBe(false);
    });
  });
});
