import { PublishJobPostUseCase } from './publish-job-post.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';

describe('PublishJobPostUseCase', () => {
  let useCase: PublishJobPostUseCase;
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

  const createMockDraft = (
    overrides?: Partial<JobPostEntity>,
  ): JobPostEntity => {
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
      status: JobStatus.DRAFT,
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
      findByIdWithSkills: jest.fn(),
      update: jest.fn(),
      updateWithSkills: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new PublishJobPostUseCase(jobPostRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('successfully publishes a draft job post, updating status to OPEN and keeping adminReviewStatus as pending', async () => {
    const draft = createMockDraft();
    const updatedEntity = createMockDraft({
      status: JobStatus.OPEN,
      adminReviewStatus: 'pending',
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    });

    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(draft);
    jobPostRepository.update.mockResolvedValueOnce(updatedEntity);

    const result = await useCase.execute(mockJobId, mockRecruiterId);

    expect(jobPostRepository.findByIdWithSkills).toHaveBeenCalledWith(
      mockJobId,
    );
    expect(jobPostRepository.update).toHaveBeenCalledWith(mockJobId, {
      status: JobStatus.OPEN,
    });

    expect(result).toBeInstanceOf(JobPostResponseDto);
    expect(result.id).toBe(mockJobId);
    expect(result.status).toBe(JobStatus.OPEN);
    expect(result.adminReviewStatus).toBe('pending');
    expect(result.category?.name).toBe('Hospitality');
    expect(result.skills).toHaveLength(1);
  });

  it('throws ApplicationValidationError if jobPostId is missing or empty', async () => {
    const p1 = useCase.execute('', mockRecruiterId);
    await expect(p1).rejects.toThrow(ApplicationValidationError);
    await expect(p1).rejects.toThrow('Job post ID is required');

    const p2 = useCase.execute('   ', mockRecruiterId);
    await expect(p2).rejects.toThrow(ApplicationValidationError);
  });

  it('throws ApplicationValidationError if recruiterId is missing or empty', async () => {
    const p1 = useCase.execute(mockJobId, '');
    await expect(p1).rejects.toThrow(ApplicationValidationError);
    await expect(p1).rejects.toThrow('Recruiter profile ID is required');

    const p2 = useCase.execute(mockJobId, '   ');
    await expect(p2).rejects.toThrow(ApplicationValidationError);
  });

  it('throws ApplicationNotFoundError if the job post does not exist', async () => {
    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(null);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow(ApplicationNotFoundError);
    await expect(promise).rejects.toThrow('Job post not found');
    expect(jobPostRepository.update).not.toHaveBeenCalled();
  });

  it('rejects with ApplicationAuthorizationError if recruiter does not own the job post without leaking private draft details', async () => {
    const draft = createMockDraft({ recruiterId: otherRecruiterId });
    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(draft);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow(ApplicationAuthorizationError);
    await expect(promise).rejects.toThrow(
      'You do not have permission to publish this job post',
    );
    expect(jobPostRepository.update).not.toHaveBeenCalled();
  });

  it('throws ApplicationValidationError if attempting to publish a job that is already OPEN (not DRAFT)', async () => {
    const openJob = createMockDraft({ status: JobStatus.OPEN });
    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(openJob);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow(ApplicationValidationError);
    await expect(promise).rejects.toThrow(
      'Only draft job posts can be published. Current status: open',
    );
    expect(jobPostRepository.update).not.toHaveBeenCalled();
  });

  it('throws ApplicationValidationError if attempting to publish a job with FILLED or CANCELLED status', async () => {
    const filledJob = createMockDraft({ status: JobStatus.FILLED });
    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(filledJob);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow(ApplicationValidationError);
    await expect(promise).rejects.toThrow(
      'Only draft job posts can be published. Current status: filled',
    );
    expect(jobPostRepository.update).not.toHaveBeenCalled();
  });

  describe('Publication readiness validation', () => {
    it('throws ApplicationValidationError if title is missing or blank', async () => {
      const invalidJob = Object.assign(
        Object.create(JobPostEntity.prototype),
        createMockDraft(),
        { title: '   ' },
      );
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow('Job title cannot be empty');
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if description is missing or blank', async () => {
      const invalidJob = Object.assign(
        Object.create(JobPostEntity.prototype),
        createMockDraft(),
        { description: '' },
      );
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow('Job description cannot be empty');
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if local job has missing or blank jobLocation', async () => {
      const invalidJob = createMockDraft({
        workType: WorkType.LOCAL,
        jobLocation: null,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Job location is required for on-site/local jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('allows publishing remote job without jobLocation', async () => {
      const remoteDraft = createMockDraft({
        workType: WorkType.REMOTE,
        jobLocation: null,
      });
      const updatedRemote = createMockDraft({
        workType: WorkType.REMOTE,
        jobLocation: null,
        status: JobStatus.OPEN,
      });

      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(remoteDraft);
      jobPostRepository.update.mockResolvedValueOnce(updatedRemote);

      const result = await useCase.execute(mockJobId, mockRecruiterId);
      expect(result.status).toBe(JobStatus.OPEN);
      expect(result.workType).toBe(WorkType.REMOTE);
    });

    it('throws ApplicationValidationError if fixed price job has no budgetAmount', async () => {
      const invalidJob = createMockDraft({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: null,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Budget amount must be a positive number for fixed price jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if hourly job has no valid hourly rate', async () => {
      const invalidJob = createMockDraft({
        paymentStructure: PaymentStructure.HOURLY,
        hourlyRate: null,
        hourlyRateMin: null,
        hourlyRateMax: null,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Hourly rate must be a positive number for hourly jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if hourly job has non-positive hourly rate', async () => {
      const invalidJob = createMockDraft({
        paymentStructure: PaymentStructure.HOURLY,
        hourlyRate: null,
        hourlyRateMin: null,
        hourlyRateMax: null,
      });
      (invalidJob as any).hourlyRate = -5;
      (invalidJob as any).hourlyRateMin = -5;
      (invalidJob as any).hourlyRateMax = -5;
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Hourly rate must be a positive number for hourly jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if hourly job has budgetAmount provided', async () => {
      const invalidJob = createMockDraft({
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: 300,
        hourlyRate: 25,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Budget amount is not allowed for hourly jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if fixed job has hourlyRate provided', async () => {
      const invalidJob = createMockDraft({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 500,
        hourlyRate: 25,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Hourly rate is not allowed for fixed price jobs',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });

    it('throws ApplicationValidationError if workersNeeded is not a positive integer', async () => {
      const invalidJob = Object.assign(
        Object.create(JobPostEntity.prototype),
        createMockDraft(),
        { workersNeeded: 0 },
      );
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(invalidJob);

      const promise = useCase.execute(mockJobId, mockRecruiterId);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'workersNeeded must be a positive integer',
      );
      expect(jobPostRepository.update).not.toHaveBeenCalled();
    });
  });

  it('propagates repository error if repository.findByIdWithSkills fails', async () => {
    const error = new Error('Database read failure');
    jobPostRepository.findByIdWithSkills.mockRejectedValueOnce(error);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow('Database read failure');
    expect(jobPostRepository.update).not.toHaveBeenCalled();
  });

  it('propagates repository error if repository.update fails', async () => {
    const draft = createMockDraft();
    jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(draft);

    const error = new Error('Database write failure');
    jobPostRepository.update.mockRejectedValueOnce(error);

    const promise = useCase.execute(mockJobId, mockRecruiterId);
    await expect(promise).rejects.toThrow('Database write failure');
  });
});
