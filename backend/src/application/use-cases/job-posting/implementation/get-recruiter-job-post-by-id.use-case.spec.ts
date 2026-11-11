import { GetRecruiterJobPostByIdUseCase } from './get-recruiter-job-post-by-id.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';

describe('GetRecruiterJobPostByIdUseCase', () => {
  let useCase: GetRecruiterJobPostByIdUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;

  const mockJobId = 'job-post-uuid-1';
  const mockRecruiterId = 'recruiter-profile-uuid-1';
  const otherRecruiterId = 'recruiter-profile-uuid-2';

  const mockCategory = new JobCategoryEntity({
    id: 'category-uuid-1',
    name: 'Hospitality',
    description: 'Hospitality services',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockSkills: SkillEntity[] = [
    new SkillEntity({
      id: 'skill-uuid-1',
      name: 'Espresso Machine Operation',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  ];

  const createMockJob = (overrides?: Partial<JobPostEntity>): JobPostEntity => {
    return new JobPostEntity({
      id: mockJobId,
      recruiterId: mockRecruiterId,
      categoryId: 'category-uuid-1',
      title: 'Festival Barista',
      description: 'Prepare espresso drinks during three-day music festival.',
      workType: WorkType.LOCAL,
      jobLocation: 'Austin, TX',
      workersNeeded: 2,
      paymentStructure: PaymentStructure.HOURLY,
      hourlyRate: 25,
      hourlyRateMin: 25,
      hourlyRateMax: 25,
      budgetAmount: null,
      status: JobStatus.OPEN,
      adminReviewStatus: 'pending',
      adminNotes: null,
      isBoosted: false,
      boostExpiresAt: null,
      startDate: new Date('2026-07-01T09:00:00.000Z'),
      estimatedDuration: '3 days',
      shiftDuration: '8 hours',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      category: mockCategory,
      skills: mockSkills,
      ...overrides,
    });
  };

  beforeEach(() => {
    jobPostRepository = {
      findByIdWithSkills: jest
        .fn()
        .mockImplementation(() => Promise.resolve(createMockJob())),
      updateWithSkills: jest.fn(),
      update: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetRecruiterJobPostByIdUseCase(jobPostRepository);
  });

  describe('1. Input Validation', () => {
    it('throws ApplicationValidationError when jobPostId is missing or empty', async () => {
      const p1 = useCase.execute('', mockRecruiterId);
      await expect(p1).rejects.toThrow(ApplicationValidationError);
      await expect(p1).rejects.toThrow('Job post ID is required');

      const p2 = useCase.execute('   ', mockRecruiterId);
      await expect(p2).rejects.toThrow(ApplicationValidationError);
      await expect(p2).rejects.toThrow('Job post ID is required');
    });

    it('throws ApplicationValidationError when recruiterId is missing or empty', async () => {
      const p1 = useCase.execute(mockJobId, '');
      await expect(p1).rejects.toThrow(ApplicationValidationError);
      await expect(p1).rejects.toThrow('Recruiter profile ID is required');

      const p2 = useCase.execute(mockJobId, '   ');
      await expect(p2).rejects.toThrow(ApplicationValidationError);
      await expect(p2).rejects.toThrow('Recruiter profile ID is required');
    });
  });

  describe('2. Existence and Ownership Verification', () => {
    it('throws ApplicationNotFoundError when job post does not exist', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(null);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Job post not found');
    });

    it('throws ApplicationAuthorizationError when recruiter does not own the job post', async () => {
      const jobOwnedByOther = createMockJob({ recruiterId: otherRecruiterId });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        jobOwnedByOther,
      );

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationAuthorizationError);
      await expect(promise).rejects.toThrow(
        'You do not have permission to view this job post',
      );
    });
  });

  describe('3. Successful Retrieval', () => {
    it('returns the mapped job post response with category and skills', async () => {
      const job = createMockJob();
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(job);

      const result = await useCase.execute(mockJobId, mockRecruiterId);

      expect(result.id).toBe(mockJobId);
      expect(result.recruiterId).toBe(mockRecruiterId);
      expect(result.title).toBe('Festival Barista');
      expect(result.status).toBe(JobStatus.OPEN);
      expect(result.category?.name).toBe('Hospitality');
      expect(result.skills).toHaveLength(1);
      expect(result.skills?.[0].name).toBe('Espresso Machine Operation');
      expect(jobPostRepository.findByIdWithSkills).toHaveBeenCalledWith(
        mockJobId,
      );
    });

    it('propagates repository database failure cleanly', async () => {
      jobPostRepository.findByIdWithSkills.mockRejectedValueOnce(
        new Error('Database query failure'),
      );

      await expect(useCase.execute(mockJobId, mockRecruiterId)).rejects.toThrow(
        'Database query failure',
      );
    });
  });
});
