import { PrismaWorkerProfileRepository } from './prisma-worker-profile.repository';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerProfileEntity } from '../../domain/entities/worker-profile.entity';

describe('PrismaWorkerProfileRepository', () => {
  let repository: PrismaWorkerProfileRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDbRecord = {
    id: 'worker-profile-uuid-1',
    userId: 'user-uuid-1',
    headline: 'Senior Full Stack Engineer',
    yearsExperience: 5,
    responseTimeHours: 2,
    availabilityStatus: 'available',
    isOpenToWork: true,
    totalCompletedGigs: 12,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      workerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaWorkerProfileRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates a new worker profile and maps Prisma result to WorkerProfileEntity', async () => {
      (prismaService.workerProfile.create as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.create({
        userId: 'user-uuid-1',
        headline: 'Senior Full Stack Engineer',
        yearsExperience: 5,
        responseTimeHours: 2,
        availabilityStatus: 'available',
        isOpenToWork: true,
        totalCompletedGigs: 12,
      });

      expect(prismaService.workerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          headline: 'Senior Full Stack Engineer',
          yearsExperience: 5,
          responseTimeHours: 2,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 12,
        },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result.id).toBe('worker-profile-uuid-1');
      expect(result.userId).toBe('user-uuid-1');
      expect(result.headline).toBe('Senior Full Stack Engineer');
      expect(result.yearsExperience).toBe(5);
      expect(result.responseTimeHours).toBe(2);
      expect(result.availabilityStatus).toBe('available');
      expect(result.isOpenToWork).toBe(true);
      expect(result.totalCompletedGigs).toBe(12);
      expect(result.createdAt).toEqual(mockDbRecord.createdAt);
      expect(result.updatedAt).toEqual(mockDbRecord.updatedAt);
    });

    it('creates a worker profile with default/null values when optional fields are omitted', async () => {
      const recordWithDefaults = {
        ...mockDbRecord,
        headline: null,
        yearsExperience: null,
        responseTimeHours: null,
        availabilityStatus: 'available',
        isOpenToWork: true,
        totalCompletedGigs: 0,
      };
      (prismaService.workerProfile.create as jest.Mock).mockResolvedValue(
        recordWithDefaults,
      );

      const result = await repository.create({
        userId: 'user-uuid-1',
      });

      expect(prismaService.workerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          headline: null,
          yearsExperience: null,
          responseTimeHours: null,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 0,
        },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result.headline).toBeNull();
      expect(result.yearsExperience).toBeNull();
      expect(result.responseTimeHours).toBeNull();
      expect(result.availabilityStatus).toBe('available');
      expect(result.isOpenToWork).toBe(true);
      expect(result.totalCompletedGigs).toBe(0);
    });
  });

  describe('findById', () => {
    it('queries database by id and maps to WorkerProfileEntity', async () => {
      (prismaService.workerProfile.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findById('worker-profile-uuid-1');

      expect(prismaService.workerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'worker-profile-uuid-1' },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result?.id).toBe('worker-profile-uuid-1');
      expect(result?.userId).toBe('user-uuid-1');
    });

    it('returns null when no record is found', async () => {
      (prismaService.workerProfile.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('queries database by unique userId and maps to WorkerProfileEntity', async () => {
      (prismaService.workerProfile.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByUserId('user-uuid-1');

      expect(prismaService.workerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result?.userId).toBe('user-uuid-1');
      expect(result?.headline).toBe('Senior Full Stack Engineer');
    });

    it('returns null when no profile exists for userId', async () => {
      (prismaService.workerProfile.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByUserId('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('queries database for all worker profiles and maps to WorkerProfileEntity array', async () => {
      (prismaService.workerProfile.findMany as jest.Mock).mockResolvedValue([
        mockDbRecord,
      ]);

      const results = await repository.findAll();

      expect(prismaService.workerProfile.findMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(WorkerProfileEntity);
      expect(results[0].id).toBe('worker-profile-uuid-1');
    });

    it('returns empty array when no worker profiles exist', async () => {
      (prismaService.workerProfile.findMany as jest.Mock).mockResolvedValue([]);

      const results = await repository.findAll();

      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates worker profile by id and maps to WorkerProfileEntity', async () => {
      const updatedRecord = {
        ...mockDbRecord,
        headline: 'Lead Architect',
        yearsExperience: 8,
      };
      (prismaService.workerProfile.update as jest.Mock).mockResolvedValue(
        updatedRecord,
      );

      const result = await repository.update('worker-profile-uuid-1', {
        headline: 'Lead Architect',
        yearsExperience: 8,
      });

      expect(prismaService.workerProfile.update).toHaveBeenCalledWith({
        where: { id: 'worker-profile-uuid-1' },
        data: {
          headline: 'Lead Architect',
          yearsExperience: 8,
        },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result.headline).toBe('Lead Architect');
      expect(result.yearsExperience).toBe(8);
    });
  });

  describe('delete', () => {
    it('deletes worker profile by id and returns true on success', async () => {
      (prismaService.workerProfile.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.delete('worker-profile-uuid-1');

      expect(prismaService.workerProfile.delete).toHaveBeenCalledWith({
        where: { id: 'worker-profile-uuid-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when delete fails', async () => {
      (prismaService.workerProfile.delete as jest.Mock).mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    it('creates profile when profile does not exist for userId', async () => {
      (prismaService.workerProfile.upsert as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.upsert('user-uuid-1', {
        headline: 'Senior Full Stack Engineer',
        yearsExperience: 5,
        responseTimeHours: 2,
        availabilityStatus: 'available',
        isOpenToWork: true,
        totalCompletedGigs: 12,
      });

      expect(prismaService.workerProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        create: {
          userId: 'user-uuid-1',
          headline: 'Senior Full Stack Engineer',
          yearsExperience: 5,
          responseTimeHours: 2,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 12,
        },
        update: {
          headline: 'Senior Full Stack Engineer',
          yearsExperience: 5,
          responseTimeHours: 2,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 12,
        },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result.id).toBe('worker-profile-uuid-1');
      expect(result.userId).toBe('user-uuid-1');
    });

    it('updates profile when profile already exists for userId', async () => {
      const updatedRecord = {
        ...mockDbRecord,
        headline: 'Updated Headline',
        isOpenToWork: false,
      };
      (prismaService.workerProfile.upsert as jest.Mock).mockResolvedValue(
        updatedRecord,
      );

      const result = await repository.upsert('user-uuid-1', {
        headline: 'Updated Headline',
        isOpenToWork: false,
      });

      expect(prismaService.workerProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        create: {
          userId: 'user-uuid-1',
          headline: 'Updated Headline',
          yearsExperience: null,
          responseTimeHours: null,
          availabilityStatus: 'available',
          isOpenToWork: false,
          totalCompletedGigs: 0,
        },
        update: {
          headline: 'Updated Headline',
          isOpenToWork: false,
        },
      });
      expect(result).toBeInstanceOf(WorkerProfileEntity);
      expect(result.headline).toBe('Updated Headline');
      expect(result.isOpenToWork).toBe(false);
    });
  });
});
