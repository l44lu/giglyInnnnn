import { GetJobCategoriesUseCase } from './get-job-categories.use-case';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';

describe('GetJobCategoriesUseCase', () => {
  let useCase: GetJobCategoriesUseCase;
  let jobCategoryRepository: jest.Mocked<IJobCategoryRepository>;

  const mockCategories: JobCategoryEntity[] = [
    new JobCategoryEntity({
      id: 'cat-uuid-1',
      name: 'Hospitality & Catering',
      description: 'Event catering, food prep, and front of house roles',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    new JobCategoryEntity({
      id: 'cat-uuid-2',
      name: 'Warehouse & Logistics',
      description: 'Order picking, packing, loading, and inventory handling',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  ];

  beforeEach(() => {
    jobCategoryRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetJobCategoriesUseCase(jobCategoryRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns categories mapped to JobCategoryResponseDto without exposing domain or database fields', async () => {
    jobCategoryRepository.findAll.mockResolvedValueOnce(mockCategories);

    const result = await useCase.execute();

    expect(jobCategoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'cat-uuid-1',
      name: 'Hospitality & Catering',
      description: 'Event catering, food prep, and front of house roles',
    });
    expect(result[1]).toEqual({
      id: 'cat-uuid-2',
      name: 'Warehouse & Logistics',
      description: 'Order picking, packing, loading, and inventory handling',
    });
    // Ensure createdAt is not exposed in DTO
    expect('createdAt' in result[0]).toBe(false);
    expect('createdAt' in result[1]).toBe(false);
  });

  it('handles empty category list and returns an empty array', async () => {
    jobCategoryRepository.findAll.mockResolvedValueOnce([]);

    const result = await useCase.execute();

    expect(jobCategoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('propagates repository error if repository.findAll rejects', async () => {
    const error = new Error('Database query failure');
    jobCategoryRepository.findAll.mockRejectedValueOnce(error);

    await expect(useCase.execute()).rejects.toThrow('Database query failure');
    expect(jobCategoryRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
