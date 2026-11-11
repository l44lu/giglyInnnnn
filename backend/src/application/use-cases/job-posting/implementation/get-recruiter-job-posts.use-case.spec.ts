import { ApplicationValidationError } from '../../../errors/application.errors';
import { GetRecruiterJobPostsUseCase } from './get-recruiter-job-posts.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import {
  GetRecruiterJobsQueryDto,
  RecruiterJobStatusFilter,
} from '../../../dto/job-posting/get-recruiter-jobs-query.dto';

describe('GetRecruiterJobPostsUseCase', () => {
  let useCase: GetRecruiterJobPostsUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;

  const mockRecruiterId = 'recruiter-profile-uuid-1';

  const mockCategory = new JobCategoryEntity({
    id: 'category-uuid-1',
    name: 'Hospitality',
    description: 'Hospitality and catering',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockSkills = [
    new SkillEntity({
      id: 'skill-uuid-1',
      name: 'Bartending',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  ];

  const createMockJob = (
    id: string,
    status: JobStatus,
    workType: WorkType,
    title: string,
    createdAt: Date,
  ): JobPostEntity => {
    return new JobPostEntity({
      id,
      recruiterId: mockRecruiterId,
      categoryId: mockCategory.id,
      title,
      description: `Description for ${title}`,
      workType,
      workersNeeded: 1,
      paymentStructure: PaymentStructure.FIXED,
      budgetAmount: 200,
      status,
      createdAt,
      updatedAt: createdAt,
      category: mockCategory,
      skills: mockSkills,
    });
  };

  // 9 sample jobs covering all statuses and workTypes:
  // 3 OPEN (2 local, 1 remote)
  // 2 DRAFT (1 local, 1 remote)
  // 1 PAUSED (local)
  // 1 FILLED (local)
  // 1 COMPLETED (remote)
  // 1 CANCELLED (local)
  const sampleJobs: JobPostEntity[] = [
    createMockJob(
      'job-1',
      JobStatus.OPEN,
      WorkType.LOCAL,
      'Active Local 1',
      new Date('2026-11-07T10:00:00.000Z'),
    ),
    createMockJob(
      'job-2',
      JobStatus.OPEN,
      WorkType.LOCAL,
      'Active Local 2',
      new Date('2026-11-06T10:00:00.000Z'),
    ),
    createMockJob(
      'job-3',
      JobStatus.OPEN,
      WorkType.REMOTE,
      'Active Remote 1',
      new Date('2026-11-05T10:00:00.000Z'),
    ),
    createMockJob(
      'job-4',
      JobStatus.DRAFT,
      WorkType.LOCAL,
      'Draft Local 1',
      new Date('2026-11-04T10:00:00.000Z'),
    ),
    createMockJob(
      'job-5',
      JobStatus.DRAFT,
      WorkType.REMOTE,
      'Draft Remote 1',
      new Date('2026-11-03T10:00:00.000Z'),
    ),
    createMockJob(
      'job-6',
      JobStatus.PAUSED,
      WorkType.LOCAL,
      'Paused Local 1',
      new Date('2026-11-02T10:00:00.000Z'),
    ),
    createMockJob(
      'job-7',
      JobStatus.FILLED,
      WorkType.LOCAL,
      'Filled Local 1',
      new Date('2026-11-01T10:00:00.000Z'),
    ),
    createMockJob(
      'job-8',
      JobStatus.COMPLETED,
      WorkType.REMOTE,
      'Completed Remote 1',
      new Date('2026-10-31T10:00:00.000Z'),
    ),
    createMockJob(
      'job-9',
      JobStatus.CANCELLED,
      WorkType.LOCAL,
      'Cancelled Local 1',
      new Date('2026-10-30T10:00:00.000Z'),
    ),
  ];

  beforeEach(() => {
    jobPostRepository = {
      findByRecruiterId: jest.fn().mockResolvedValue([...sampleJobs]),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
    } as unknown as jest.Mocked<IJobPostRepository>;

    useCase = new GetRecruiterJobPostsUseCase(jobPostRepository);
  });

  describe('Validation & Ownership Boundary', () => {
    it('should throw ApplicationValidationError if recruiterId is missing or empty', async () => {
      await expect(useCase.execute('')).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute('   ')).rejects.toThrow(
        'Recruiter profile ID is required',
      );
    });

    it('should call findByRecruiterId using trimmed recruiter profile ID', async () => {
      await useCase.execute(`  ${mockRecruiterId}  `);
      expect(jobPostRepository.findByRecruiterId).toHaveBeenCalledWith(
        mockRecruiterId,
      );
      expect(jobPostRepository.findByRecruiterId).toHaveBeenCalledTimes(1);
    });

    it('should reject unsupported status filter values', async () => {
      const invalidQuery = {
        status: 'invalid_status' as any,
      } as GetRecruiterJobsQueryDto;

      await expect(
        useCase.execute(mockRecruiterId, invalidQuery),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockRecruiterId, invalidQuery),
      ).rejects.toThrow('Invalid status filter: invalid_status');
    });
  });

  describe('Default Tab & "all" Filter', () => {
    it('should return all recruiter jobs when query is omitted', async () => {
      const result = await useCase.execute(mockRecruiterId);

      expect(result.items.length).toBe(9);
      expect(result.summary.total).toBe(9);
      expect(result.items[0].id).toBe('job-1');
      expect(result.items[8].id).toBe('job-9');
    });

    it('should return all recruiter jobs when query status is explicitly "all"', async () => {
      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.ALL,
      });
      const result = await useCase.execute(mockRecruiterId, query);

      expect(result.items.length).toBe(9);
      expect(result.summary.total).toBe(9);
    });
  });

  describe('Status Tab Filtering', () => {
    it('should return only OPEN jobs when status filter is "active"', async () => {
      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.ACTIVE,
      });
      const result = await useCase.execute(mockRecruiterId, query);

      expect(result.items.length).toBe(3);
      expect(result.items.every((item) => item.status === JobStatus.OPEN)).toBe(
        true,
      );
      expect(result.items.map((i) => i.id)).toEqual([
        'job-1',
        'job-2',
        'job-3',
      ]);
    });

    it('should return only DRAFT jobs when status filter is "draft"', async () => {
      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.DRAFT,
      });
      const result = await useCase.execute(mockRecruiterId, query);

      expect(result.items.length).toBe(2);
      expect(
        result.items.every((item) => item.status === JobStatus.DRAFT),
      ).toBe(true);
      expect(result.items.map((i) => i.id)).toEqual(['job-4', 'job-5']);
    });

    it('should return only PAUSED jobs when status filter is "paused"', async () => {
      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.PAUSED,
      });
      const result = await useCase.execute(mockRecruiterId, query);

      expect(result.items.length).toBe(1);
      expect(result.items[0].status).toBe(JobStatus.PAUSED);
      expect(result.items[0].id).toBe('job-6');
    });

    it('should return FILLED, COMPLETED, and CANCELLED jobs when status filter is "closed"', async () => {
      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.CLOSED,
      });
      const result = await useCase.execute(mockRecruiterId, query);

      expect(result.items.length).toBe(3);
      expect(result.items.map((i) => i.id)).toEqual([
        'job-7',
        'job-8',
        'job-9',
      ]);
      expect(result.items[0].status).toBe(JobStatus.FILLED);
      expect(result.items[1].status).toBe(JobStatus.COMPLETED);
      expect(result.items[2].status).toBe(JobStatus.CANCELLED);
    });
  });

  describe('Summary Statistics Calculations', () => {
    it('should correctly calculate summary counts across all recruiter jobs', async () => {
      const result = await useCase.execute(mockRecruiterId);

      expect(result.summary).toEqual({
        total: 9,
        active: 3,
        draft: 2,
        paused: 1,
        closed: 3,
        activeLocal: 2,
        activeRemote: 1,
      });
    });

    it('should keep summary statistics unchanged when a status filter is applied', async () => {
      const draftQuery = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.DRAFT,
      });
      const result = await useCase.execute(mockRecruiterId, draftQuery);

      // Items must be filtered down to 2 drafts
      expect(result.items.length).toBe(2);

      // Summary must still represent the global totals for that recruiter
      expect(result.summary).toEqual({
        total: 9,
        active: 3,
        draft: 2,
        paused: 1,
        closed: 3,
        activeLocal: 2,
        activeRemote: 1,
      });
    });

    it('should calculate activeLocal and activeRemote only from OPEN jobs', async () => {
      const result = await useCase.execute(mockRecruiterId);

      // Only OPEN jobs contribute to activeLocal and activeRemote
      expect(result.summary.active).toBe(3);
      expect(result.summary.activeLocal).toBe(2);
      expect(result.summary.activeRemote).toBe(1);
      expect(result.summary.activeLocal + result.summary.activeRemote).toBe(
        result.summary.active,
      );
    });
  });

  describe('Empty Results Handling', () => {
    it('should return zero-valued summary and empty items array when recruiter has no jobs', async () => {
      jobPostRepository.findByRecruiterId.mockResolvedValue([]);

      const result = await useCase.execute(mockRecruiterId);

      expect(result.items).toEqual([]);
      expect(result.summary).toEqual({
        total: 0,
        active: 0,
        draft: 0,
        paused: 0,
        closed: 0,
        activeLocal: 0,
        activeRemote: 0,
      });
    });

    it('should handle null/undefined repository return safely', async () => {
      jobPostRepository.findByRecruiterId.mockResolvedValue(null as any);

      const result = await useCase.execute(mockRecruiterId);

      expect(result.items).toEqual([]);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('Entity Mapping & Immutability', () => {
    it('should map domain entities using JobPostMapper including hydrated categories and skills', async () => {
      const result = await useCase.execute(mockRecruiterId);

      const firstItem = result.items[0];
      expect(firstItem.id).toBe('job-1');
      expect(firstItem.title).toBe('Active Local 1');
      expect(firstItem.category?.id).toBe(mockCategory.id);
      expect(firstItem.category?.name).toBe('Hospitality');
      expect(firstItem.skills?.length).toBe(1);
      expect(firstItem.skills?.[0].name).toBe('Bartending');
    });

    it('should preserve original repository sorting (createdAt descending)', async () => {
      const result = await useCase.execute(mockRecruiterId);

      const timestamps = result.items.map((i) =>
        new Date(i.createdAt).getTime(),
      );
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });

    it('should not mutate original repository items array', async () => {
      const originalSample = [...sampleJobs];
      await useCase.execute(
        mockRecruiterId,
        new GetRecruiterJobsQueryDto({
          status: RecruiterJobStatusFilter.DRAFT,
        }),
      );

      expect(sampleJobs.length).toBe(originalSample.length);
      expect(sampleJobs.map((j) => j.id)).toEqual(
        originalSample.map((j) => j.id),
      );
    });
  });
});
