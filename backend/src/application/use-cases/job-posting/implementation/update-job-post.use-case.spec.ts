import { UpdateJobPostUseCase } from './update-job-post.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import {
  FindJobApplicationsResult,
  IJobApplicationRepository,
} from '../../../../domain/repositories/job-application.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { UpdateJobPostInputDto } from '../../../dto/job-posting/update-job-post-input.dto';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../../errors/application.errors';

describe('UpdateJobPostUseCase', () => {
  let useCase: UpdateJobPostUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;
  let jobCategoryRepository: jest.Mocked<IJobCategoryRepository>;
  let skillRepository: jest.Mocked<ISkillRepository>;
  let jobApplicationRepository: jest.Mocked<IJobApplicationRepository>;

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
    new SkillEntity({
      id: 'skill-uuid-2',
      name: 'Latte Art',
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

  const createValidDto = (
    overrides?: Partial<UpdateJobPostInputDto>,
  ): UpdateJobPostInputDto => {
    return new UpdateJobPostInputDto({
      categoryId: 'category-uuid-1',
      title: 'Senior Festival Barista',
      description:
        'Lead espresso bar operations and supervise assistant baristas.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      skillIds: ['skill-uuid-1', 'skill-uuid-2'],
      workersNeeded: 3,
      hourlyRate: 30,
      jobLocation: 'Austin, TX',
      estimatedDuration: '4 days',
      shiftDuration: '8 hours',
      ...overrides,
    });
  };

  beforeEach(() => {
    jobPostRepository = {
      findByIdWithSkills: jest
        .fn()
        .mockImplementation(() => Promise.resolve(createMockJob())),
      updateWithSkills: jest
        .fn()
        .mockImplementation(() => Promise.resolve(createMockJob())),
      update: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    jobCategoryRepository = {
      findById: jest.fn().mockResolvedValue(mockCategory),
      findAll: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    skillRepository = {
      findByIds: jest.fn().mockResolvedValue(mockSkills),
      findByName: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    jobApplicationRepository = {
      create: jest.fn(),
      findByJobAndWorker: jest.fn(),
      findByJobPostId: jest.fn().mockResolvedValue({
        job: {
          id: mockJobId,
          title: 'Festival Barista',
          status: JobStatus.OPEN,
          workersNeeded: 2,
          workType: WorkType.LOCAL,
          paymentStructure: PaymentStructure.HOURLY,
          budgetAmount: null,
          hourlyRate: 25,
          acceptedCount: 0,
        },
        items: [],
        total: 0,
        page: 1,
        limit: 1,
        summary: {
          total: 0,
          pending: 0,
          shortlisted: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0,
        },
      } satisfies FindJobApplicationsResult),
      shortlistApplication: jest.fn(),
      rejectApplication: jest.fn(),
      acceptApplication: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new UpdateJobPostUseCase(
      jobPostRepository,
      jobCategoryRepository,
      skillRepository,
      jobApplicationRepository,
    );
  });

  describe('1. Input Validation and Identification', () => {
    it('throws ApplicationValidationError when jobPostId is missing or empty', async () => {
      const dto = createValidDto();
      const promise = useCase.execute('', mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow('Job post ID is required');
    });

    it('throws ApplicationValidationError when recruiterId is missing or empty', async () => {
      const dto = createValidDto();
      const promise = useCase.execute(mockJobId, '', dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow('Recruiter profile ID is required');
    });

    it('throws ApplicationValidationError when dto is undefined or null', async () => {
      await expect(
        useCase.execute(
          mockJobId,
          mockRecruiterId,
          null as unknown as UpdateJobPostInputDto,
        ),
      ).rejects.toThrow(ApplicationValidationError);
    });
  });

  describe('2. Resource Existence and Ownership Verification', () => {
    it('throws ApplicationNotFoundError when the job post does not exist', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(null);

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto(),
      );
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Job post not found');
    });

    it('throws ApplicationAuthorizationError when recruiter does not own the job post', async () => {
      const jobOwnedByOther = createMockJob({ recruiterId: otherRecruiterId });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        jobOwnedByOther,
      );

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto(),
      );
      await expect(promise).rejects.toThrow(ApplicationAuthorizationError);
      await expect(promise).rejects.toThrow(
        'You do not have permission to edit this job post',
      );
    });
  });

  describe('3. Status-Based Lifecycle Restrictions', () => {
    it('allows editing when job status is DRAFT', async () => {
      const draftJob = createMockJob({ status: JobStatus.DRAFT });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(draftJob);
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ title: 'Updated Draft', status: JobStatus.DRAFT }),
      );

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ title: 'Updated Draft' }),
      );

      expect(result.title).toBe('Updated Draft');
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledTimes(1);
    });

    it('allows editing when job status is OPEN', async () => {
      const openJob = createMockJob({ status: JobStatus.OPEN });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(openJob);
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ title: 'Updated Open Gig', status: JobStatus.OPEN }),
      );

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ title: 'Updated Open Gig' }),
      );

      expect(result.title).toBe('Updated Open Gig');
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledTimes(1);
    });

    it('allows editing when job status is PAUSED', async () => {
      const pausedJob = createMockJob({ status: JobStatus.PAUSED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(pausedJob);
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({
          title: 'Updated Paused Gig',
          status: JobStatus.PAUSED,
        }),
      );

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ title: 'Updated Paused Gig' }),
      );

      expect(result.title).toBe('Updated Paused Gig');
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledTimes(1);
    });

    it('rejects editing when job status is FILLED', async () => {
      const filledJob = createMockJob({ status: JobStatus.FILLED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(filledJob);

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto(),
      );
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Cannot edit job post with status: filled',
      );
    });

    it('rejects editing when job status is COMPLETED', async () => {
      const completedJob = createMockJob({ status: JobStatus.COMPLETED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(completedJob);

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto(),
      );
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Cannot edit job post with status: completed',
      );
    });

    it('rejects editing when job status is CANCELLED', async () => {
      const cancelledJob = createMockJob({ status: JobStatus.CANCELLED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(cancelledJob);

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto(),
      );
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Cannot edit job post with status: cancelled',
      );
    });
  });

  describe('4. Category and Skill Validation', () => {
    it('throws ApplicationNotFoundError when selected category does not exist', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );
      jobCategoryRepository.findById.mockResolvedValueOnce(null);

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ categoryId: 'non-existent-cat' }),
      );
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Job category not found');
    });

    it('throws ApplicationValidationError when duplicate skill IDs are supplied', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ skillIds: ['skill-uuid-1', 'skill-uuid-1'] }),
      );
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Duplicate skill IDs are not allowed',
      );
    });

    it('throws ApplicationValidationError when one or more skill IDs do not exist in catalog', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );
      skillRepository.findByIds.mockResolvedValueOnce([mockSkills[0]]); // Only 1 of 2 found

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({
          skillIds: ['skill-uuid-1', 'non-existent-skill'],
        }),
      );
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'One or more selected skills do not exist: non-existent-skill',
      );
    });

    it('successfully replaces skills with new skill IDs', async () => {
      const existing = createMockJob({ skills: [mockSkills[0]] });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(existing);
      skillRepository.findByIds.mockResolvedValueOnce([mockSkills[1]]);

      const updated = createMockJob({ skills: [mockSkills[1]] });
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(updated);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ skillIds: ['skill-uuid-2'] }),
      );

      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledWith(
        mockJobId,
        expect.any(Object),
        ['skill-uuid-2'],
      );
      expect(result.skills).toHaveLength(1);
      expect(result.skills?.[0].id).toBe('skill-uuid-2');
    });

    it('handles empty skill array correctly by passing empty array to repository', async () => {
      const existing = createMockJob({ skills: mockSkills });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(existing);

      const updatedNoSkills = createMockJob({ skills: [] });
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(updatedNoSkills);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ skillIds: [] }),
      );

      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledWith(
        mockJobId,
        expect.any(Object),
        [],
      );
      expect(result.skills).toHaveLength(0);
    });
  });

  describe('5. Payment Structure Validation', () => {
    it('throws ApplicationValidationError when hourlyRate is provided for fixed price jobs', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );

      const dto = createValidDto({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 500,
        hourlyRate: 25,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'hourlyRate is not allowed for fixed price jobs',
      );
    });

    it('throws ApplicationValidationError when budgetAmount is negative for fixed price jobs', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );

      const dto = createValidDto({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: -50,
        hourlyRate: null,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'budgetAmount must be a non-negative number',
      );
    });

    it('throws ApplicationValidationError when budgetAmount is missing or zero for fixed price OPEN jobs', async () => {
      const openJob = createMockJob({ status: JobStatus.OPEN });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(openJob);

      const dto = createValidDto({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 0,
        hourlyRate: null,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Budget amount must be a positive number for fixed price jobs',
      );
    });

    it('throws ApplicationValidationError when budgetAmount is missing or zero for fixed price PAUSED jobs', async () => {
      const pausedJob = createMockJob({ status: JobStatus.PAUSED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(pausedJob);

      const dto = createValidDto({
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 0,
        hourlyRate: null,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Budget amount must be a positive number for fixed price jobs',
      );
    });

    it('throws ApplicationValidationError when budgetAmount is provided for hourly jobs', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );

      const dto = createValidDto({
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: 1000,
        hourlyRate: 30,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'budgetAmount is not allowed for hourly jobs',
      );
    });

    it('throws ApplicationValidationError when hourlyRate is missing or zero for hourly OPEN jobs', async () => {
      const openJob = createMockJob({ status: JobStatus.OPEN });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(openJob);

      const dto = createValidDto({
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 0,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Hourly rate must be greater than zero for hourly jobs',
      );
    });

    it('throws ApplicationValidationError when hourlyRate is missing or zero for hourly PAUSED jobs', async () => {
      const pausedJob = createMockJob({ status: JobStatus.PAUSED });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(pausedJob);

      const dto = createValidDto({
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 0,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Hourly rate must be greater than zero for hourly jobs',
      );
    });
  });

  describe('6. Field Validation & Repository Failure Propagation', () => {
    it('throws ApplicationValidationError when jobLocation is missing for local OPEN job', async () => {
      const openJob = createMockJob({
        status: JobStatus.OPEN,
        workType: WorkType.LOCAL,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(openJob);

      const dto = createValidDto({
        workType: WorkType.LOCAL,
        jobLocation: '',
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Job location is required for on-site/local jobs',
      );
    });

    it('throws ApplicationValidationError when jobLocation is missing for local PAUSED job', async () => {
      const pausedJob = createMockJob({
        status: JobStatus.PAUSED,
        workType: WorkType.LOCAL,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(pausedJob);

      const dto = createValidDto({
        workType: WorkType.LOCAL,
        jobLocation: '',
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'Job location is required for on-site/local jobs',
      );
    });

    it('accepts editing for PAUSED job with valid FIXED payment and LOCAL location', async () => {
      const pausedJob = createMockJob({
        status: JobStatus.PAUSED,
        workType: WorkType.LOCAL,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(pausedJob);
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({
          title: 'Updated Paused Fixed Job',
          status: JobStatus.PAUSED,
          workType: WorkType.LOCAL,
          jobLocation: 'Dallas, TX',
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: 850,
          hourlyRate: null,
        }),
      );

      const dto = createValidDto({
        title: 'Updated Paused Fixed Job',
        workType: WorkType.LOCAL,
        jobLocation: 'Dallas, TX',
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 850,
        hourlyRate: null,
      });

      const result = await useCase.execute(mockJobId, mockRecruiterId, dto);

      expect(result.title).toBe('Updated Paused Fixed Job');
      expect(result.status).toBe(JobStatus.PAUSED);
      expect(result.budgetAmount).toBe(850);
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledTimes(1);
    });

    it('throws ApplicationValidationError when workersNeeded is less than 1', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );

      const dto = createValidDto({
        workersNeeded: 0,
      });

      const promise = useCase.execute(mockJobId, mockRecruiterId, dto);
      await expect(promise).rejects.toThrow(ApplicationValidationError);
      await expect(promise).rejects.toThrow(
        'workersNeeded must be a positive integer',
      );
    });

    it('propagates repository database failure cleanly', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob(),
      );
      jobPostRepository.updateWithSkills.mockRejectedValueOnce(
        new Error('Database transaction timeout'),
      );

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, createValidDto()),
      ).rejects.toThrow('Database transaction timeout');
    });

    it('does not accept protected fields from update payload (id, recruiterId, status, isBoosted, etc.)', async () => {
      const existing = createMockJob({
        id: mockJobId,
        recruiterId: mockRecruiterId,
        status: JobStatus.DRAFT,
        isBoosted: false,
      });
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(existing);

      const updated = createMockJob({
        title: 'Updated Title',
      });
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(updated);

      const dto = createValidDto({ title: 'Updated Title' });
      // Malicious client attempting to inject protected fields
      (dto as any).id = 'injected-id';
      (dto as any).recruiterId = 'injected-recruiter';
      (dto as any).status = JobStatus.FILLED;
      (dto as any).isBoosted = true;

      await useCase.execute(mockJobId, mockRecruiterId, dto);

      const passedData = jobPostRepository.updateWithSkills.mock.calls[0][1];
      expect((passedData as any).id).toBeUndefined();
      expect((passedData as any).recruiterId).toBeUndefined();
      expect((passedData as any).status).toBeUndefined();
      expect((passedData as any).isBoosted).toBeUndefined();
    });
  });

  describe('7. workersNeeded Capacity Edit Guard', () => {
    const createApplicationsSummary = (
      accepted: number,
      workersNeeded = 4,
    ): FindJobApplicationsResult => ({
      job: {
        id: mockJobId,
        title: 'Festival Barista',
        status: JobStatus.OPEN,
        workersNeeded,
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 25,
        acceptedCount: accepted,
      },
      items: [],
      total: accepted,
      page: 1,
      limit: 1,
      summary: {
        total: accepted,
        pending: 0,
        shortlisted: 0,
        accepted,
        rejected: 0,
        withdrawn: 0,
      },
    });

    it('does not query accepted count when workersNeeded is unchanged or omitted', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 3 }),
      );
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 3 }),
      );

      await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ workersNeeded: 3 }),
      );
      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();

      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 3 }),
      );
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 3 }),
      );

      await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ workersNeeded: undefined }),
      );
      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
      expect(jobPostRepository.updateWithSkills).toHaveBeenLastCalledWith(
        mockJobId,
        expect.objectContaining({ workersNeeded: 3 }),
        ['skill-uuid-1', 'skill-uuid-2'],
      );
    });

    it('rejects reducing workersNeeded below the accepted application count', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 4 }),
      );
      jobApplicationRepository.findByJobPostId.mockResolvedValueOnce(
        createApplicationsSummary(3, 4),
      );

      const promise = useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ workersNeeded: 2 }),
      );

      await expect(promise).rejects.toThrow(ApplicationConflictError);
      await expect(promise).rejects.toThrow(
        'Cannot reduce workersNeeded to 2 because 3 applications have already been accepted',
      );
      expect(jobApplicationRepository.findByJobPostId).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        page: 1,
        limit: 1,
      });
      expect(jobPostRepository.updateWithSkills).not.toHaveBeenCalled();
    });

    it('allows reducing workersNeeded to equal the accepted application count', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 4 }),
      );
      jobApplicationRepository.findByJobPostId.mockResolvedValueOnce(
        createApplicationsSummary(2, 4),
      );
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 2 }),
      );

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ workersNeeded: 2 }),
      );

      expect(jobApplicationRepository.findByJobPostId).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        page: 1,
        limit: 1,
      });
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ workersNeeded: 2 }),
        ['skill-uuid-1', 'skill-uuid-2'],
      );
      expect(result.workersNeeded).toBe(2);
    });

    it('allows increasing workersNeeded without rejecting', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 2 }),
      );
      jobPostRepository.updateWithSkills.mockResolvedValueOnce(
        createMockJob({ status: JobStatus.OPEN, workersNeeded: 5 }),
      );

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        createValidDto({ workersNeeded: 5 }),
      );

      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
      expect(jobPostRepository.updateWithSkills).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ workersNeeded: 5 }),
        ['skill-uuid-1', 'skill-uuid-2'],
      );
      expect(result.workersNeeded).toBe(5);
    });
  });
});
