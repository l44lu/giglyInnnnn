import { PrismaJobCategoryRepository } from './prisma-job-category.repository';
import { PrismaService } from '../prisma/prisma.service';
import { JobCategoryEntity } from '../../domain/entities/job-category.entity';

describe('PrismaJobCategoryRepository', () => {
  let repository: PrismaJobCategoryRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCategoryRecord1 = {
    id: 'category-uuid-1',
    name: 'Event Staffing',
    description: 'Event hosts, ushers, and staff',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockCategoryRecord2 = {
    id: 'category-uuid-2',
    name: 'Warehousing & Logistics',
    description: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      jobCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaJobCategoryRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all categories ordered alphabetically by name and maps to JobCategoryEntity', async () => {
      (prismaService.jobCategory.findMany as jest.Mock).mockResolvedValue([
        mockCategoryRecord1,
        mockCategoryRecord2,
      ]);

      const result = await repository.findAll();

      expect(prismaService.jobCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(JobCategoryEntity);
      expect(result[0].id).toBe('category-uuid-1');
      expect(result[0].name).toBe('Event Staffing');
      expect(result[0].description).toBe('Event hosts, ushers, and staff');
      expect(result[0].createdAt).toEqual(mockCategoryRecord1.createdAt);

      expect(result[1]).toBeInstanceOf(JobCategoryEntity);
      expect(result[1].id).toBe('category-uuid-2');
      expect(result[1].name).toBe('Warehousing & Logistics');
      expect(result[1].description).toBeNull();
      expect(result[1].createdAt).toEqual(mockCategoryRecord2.createdAt);
    });

    it('returns empty array when no categories exist', async () => {
      (prismaService.jobCategory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAll();

      expect(prismaService.jobCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns JobCategoryEntity when category is found by id', async () => {
      (prismaService.jobCategory.findUnique as jest.Mock).mockResolvedValue(
        mockCategoryRecord1,
      );

      const result = await repository.findById('category-uuid-1');

      expect(prismaService.jobCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-uuid-1' },
      });
      expect(result).toBeInstanceOf(JobCategoryEntity);
      expect(result?.id).toBe('category-uuid-1');
      expect(result?.name).toBe('Event Staffing');
      expect(result?.description).toBe('Event hosts, ushers, and staff');
    });

    it('returns null when category is not found by id', async () => {
      (prismaService.jobCategory.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findById('non-existent-id');

      expect(prismaService.jobCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('returns JobCategoryEntity when category is found by unique name', async () => {
      (prismaService.jobCategory.findUnique as jest.Mock).mockResolvedValue(
        mockCategoryRecord1,
      );

      const result = await repository.findByName('Event Staffing');

      expect(prismaService.jobCategory.findUnique).toHaveBeenCalledWith({
        where: { name: 'Event Staffing' },
      });
      expect(result).toBeInstanceOf(JobCategoryEntity);
      expect(result?.id).toBe('category-uuid-1');
      expect(result?.name).toBe('Event Staffing');
      expect(result?.description).toBe('Event hosts, ushers, and staff');
    });

    it('returns null when category is not found by name', async () => {
      (prismaService.jobCategory.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByName('Unknown Category');

      expect(prismaService.jobCategory.findUnique).toHaveBeenCalledWith({
        where: { name: 'Unknown Category' },
      });
      expect(result).toBeNull();
    });
  });

  describe('inherited PrismaBaseRepository methods', () => {
    it('creates a job category record and maps it to JobCategoryEntity', async () => {
      (prismaService.jobCategory.create as jest.Mock).mockResolvedValue(
        mockCategoryRecord1,
      );

      const result = await repository.create({
        name: 'Event Staffing',
        description: 'Event hosts, ushers, and staff',
      });

      expect(prismaService.jobCategory.create).toHaveBeenCalledWith({
        data: {
          name: 'Event Staffing',
          description: 'Event hosts, ushers, and staff',
        },
      });
      expect(result).toBeInstanceOf(JobCategoryEntity);
      expect(result.id).toBe('category-uuid-1');
      expect(result.name).toBe('Event Staffing');
    });

    it('updates a job category record and maps it to JobCategoryEntity', async () => {
      const updatedRecord = {
        ...mockCategoryRecord1,
        description: 'Updated description',
      };
      (prismaService.jobCategory.update as jest.Mock).mockResolvedValue(
        updatedRecord,
      );

      const result = await repository.update('category-uuid-1', {
        description: 'Updated description',
      });

      expect(prismaService.jobCategory.update).toHaveBeenCalledWith({
        where: { id: 'category-uuid-1' },
        data: { description: 'Updated description' },
      });
      expect(result).toBeInstanceOf(JobCategoryEntity);
      expect(result.description).toBe('Updated description');
    });

    it('deletes a job category and returns true on success', async () => {
      (prismaService.jobCategory.delete as jest.Mock).mockResolvedValue(
        mockCategoryRecord1,
      );

      const result = await repository.delete('category-uuid-1');

      expect(prismaService.jobCategory.delete).toHaveBeenCalledWith({
        where: { id: 'category-uuid-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when delete throws an error', async () => {
      (prismaService.jobCategory.delete as jest.Mock).mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await repository.delete('non-existent-id');

      expect(prismaService.jobCategory.delete).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBe(false);
    });
  });
});
