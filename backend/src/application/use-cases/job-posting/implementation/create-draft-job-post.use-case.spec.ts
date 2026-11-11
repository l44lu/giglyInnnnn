import {
  ApplicationValidationError,
  ApplicationNotFoundError,
} from '../../../errors/application.errors';
import { CreateDraftJobPostUseCase } from './create-draft-job-post.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { CreateDraftJobPostInputDto } from '../../../dto/job-posting/create-draft-job-post-input.dto';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

describe('CreateDraftJobPostUseCase', () => {
  let useCase: CreateDraftJobPostUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;
  let jobCategoryRepository: jest.Mocked<IJobCategoryRepository>;
  let skillRepository: jest.Mocked<ISkillRepository>;

  const mockRecruiterId = 'recruiter-profile-uuid-1';
  const mockCategoryId = 'category-uuid-1';
  const mockSkillId1 = 'skill-uuid-1';
  const mockSkillId2 = 'skill-uuid-2';

  const mockCategory = new JobCategoryEntity({
    id: mockCategoryId,
    name: 'Hospitality',
    description: 'Hospitality and catering services',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockSkills: SkillEntity[] = [
    new SkillEntity({
      id: mockSkillId1,
      name: 'Coffee Brewing',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    new SkillEntity({
      id: mockSkillId2,
      name: 'Food Service',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  ];

  const createValidDto = (
    overrides?: Partial<CreateDraftJobPostInputDto>,
  ): CreateDraftJobPostInputDto => {
    return new CreateDraftJobPostInputDto({
      categoryId: mockCategoryId,
      title: 'Festival Barista',
      description: 'Prepare espresso drinks during three-day music festival.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      skillIds: [mockSkillId1, mockSkillId2],
      workersNeeded: 3,
      startDate: '2026-07-01T09:00:00.000Z',
      estimatedDuration: '3 days',
      shiftDuration: '8 hours',
      jobLocation: 'Austin, TX',
      jobLocationLat: 30.2672,
      jobLocationLng: -97.7431,
      hourlyRate: 25,
      ...overrides,
    });
  };

  const createMockJobPostEntity = (
    data: Partial<JobPostEntity>,
  ): JobPostEntity => {
    return new JobPostEntity({
      id: 'job-post-uuid-1',
      recruiterId: mockRecruiterId,
      categoryId: mockCategoryId,
      title: 'Festival Barista',
      description: 'Prepare espresso drinks during three-day music festival.',
      workType: WorkType.LOCAL,
      workersNeeded: 3,
      startDate: new Date('2026-07-01T09:00:00.000Z'),
      estimatedDuration: '3 days',
      shiftDuration: '8 hours',
      jobLocation: 'Austin, TX',
      jobLocationLat: 30.2672,
      jobLocationLng: -97.7431,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 25,
      hourlyRateMin: 25,
      hourlyRateMax: 25,
      status: JobStatus.DRAFT,
      isBoosted: false,
      boostExpiresAt: null,
      adminReviewStatus: 'pending',
      adminNotes: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      category: mockCategory,
      skills: mockSkills,
      ...data,
    });
  };

  beforeEach(() => {
    jobPostRepository = {
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      updateWithSkills: jest.fn(),
      delete: jest.fn(),
    };

    jobCategoryRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    skillRepository = {
      findByIds: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreateDraftJobPostUseCase(
      jobPostRepository,
      jobCategoryRepository,
      skillRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates draft job post successfully with skills, DRAFT status, and recruiter profile association', async () => {
    const dto = createValidDto();
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
    skillRepository.findByIds.mockResolvedValueOnce(mockSkills);

    const expectedCreatedEntity = createMockJobPostEntity({});
    jobPostRepository.createWithSkills.mockResolvedValueOnce(
      expectedCreatedEntity,
    );

    const result = await useCase.execute(mockRecruiterId, dto);

    expect(jobCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
    expect(skillRepository.findByIds).toHaveBeenCalledWith([
      mockSkillId1,
      mockSkillId2,
    ]);
    expect(jobPostRepository.createWithSkills).toHaveBeenCalledTimes(1);

    const passedJobData = jobPostRepository.createWithSkills.mock.calls[0][0];
    const passedSkillIds = jobPostRepository.createWithSkills.mock.calls[0][1];

    expect(passedJobData.recruiterId).toBe(mockRecruiterId);
    expect(passedJobData.categoryId).toBe(mockCategoryId);
    expect(passedJobData.status).toBe(JobStatus.DRAFT);
    expect(passedJobData.workersNeeded).toBe(3);
    expect(passedSkillIds).toEqual([mockSkillId1, mockSkillId2]);

    expect(result).toBeInstanceOf(JobPostResponseDto);
    expect(result.id).toBe('job-post-uuid-1');
    expect(result.recruiterId).toBe(mockRecruiterId);
    expect(result.status).toBe(JobStatus.DRAFT);
    expect(result.category?.name).toBe('Hospitality');
    expect(result.skills).toHaveLength(2);
  });

  it('creates draft job post successfully when skillIds is omitted or empty', async () => {
    const dto = createValidDto({ skillIds: undefined });
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);

    const expectedCreatedEntity = createMockJobPostEntity({ skills: [] });
    jobPostRepository.createWithSkills.mockResolvedValueOnce(
      expectedCreatedEntity,
    );

    const result = await useCase.execute(mockRecruiterId, dto);

    expect(jobCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
    expect(skillRepository.findByIds).not.toHaveBeenCalled();
    expect(jobPostRepository.createWithSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        recruiterId: mockRecruiterId,
        status: JobStatus.DRAFT,
      }),
      [],
    );
    expect(result.status).toBe(JobStatus.DRAFT);
  });

  it('throws ApplicationValidationError if recruiter profile ID is missing or empty', async () => {
    const dto = createValidDto();
    await expect(useCase.execute('', dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute('   ', dto)).rejects.toThrow(
      'Recruiter profile ID is required',
    );
    expect(jobPostRepository.createWithSkills).not.toHaveBeenCalled();
  });

  it('throws ApplicationValidationError if categoryId is missing or empty', async () => {
    const dto = createValidDto({ categoryId: '' });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Category ID is required',
    );
  });

  it('throws ApplicationValidationError if title is missing or empty', async () => {
    const dto = createValidDto({ title: '   ' });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Job title cannot be empty',
    );
  });

  it('throws ApplicationValidationError if description is missing or empty', async () => {
    const dto = createValidDto({ description: '' });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Job description cannot be empty',
    );
  });

  it('throws ApplicationValidationError if workType is invalid', async () => {
    const dto = createValidDto({
      workType: 'INVALID_TYPE' as unknown as WorkType,
    });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Valid work type is required',
    );
  });

  it('throws ApplicationValidationError if paymentStructure is invalid', async () => {
    const dto = createValidDto({
      paymentStructure: 'INVALID_STRUCT' as unknown as PaymentStructure,
    });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Valid payment structure is required',
    );
  });

  it('throws ApplicationValidationError if workersNeeded is not a positive integer or is null', async () => {
    const dto1 = createValidDto({ workersNeeded: 0 });
    await expect(useCase.execute(mockRecruiterId, dto1)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto1)).rejects.toThrow(
      'workersNeeded must be a positive integer',
    );

    const dto2 = createValidDto({ workersNeeded: -2 });
    await expect(useCase.execute(mockRecruiterId, dto2)).rejects.toThrow(
      ApplicationValidationError,
    );

    const dto3 = createValidDto({ workersNeeded: 1.5 });
    await expect(useCase.execute(mockRecruiterId, dto3)).rejects.toThrow(
      ApplicationValidationError,
    );

    const dto4 = createValidDto({ workersNeeded: null as unknown as number });
    await expect(useCase.execute(mockRecruiterId, dto4)).rejects.toThrow(
      ApplicationValidationError,
    );
  });

  it('defaults workersNeeded to 1 when genuinely omitted', async () => {
    const dto = createValidDto();
    delete dto.workersNeeded;
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
    skillRepository.findByIds.mockResolvedValueOnce(mockSkills);
    jobPostRepository.createWithSkills.mockResolvedValueOnce(
      createMockJobPostEntity({ workersNeeded: 1 }),
    );

    await useCase.execute(mockRecruiterId, dto);
    const passedData = jobPostRepository.createWithSkills.mock.calls[0][0];
    expect(passedData.workersNeeded).toBe(1);
  });

  it('throws ApplicationValidationError if startDate is an invalid date string', async () => {
    const dto = createValidDto({ startDate: 'not-a-valid-date' });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'startDate must be a valid date',
    );
  });

  it('throws ApplicationValidationError if hourlyRate is 0 or negative', async () => {
    const dtoZero = createValidDto({ hourlyRate: 0 });
    await expect(useCase.execute(mockRecruiterId, dtoZero)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dtoZero)).rejects.toThrow(
      'hourlyRate must be greater than zero',
    );

    const dtoNeg = createValidDto({ hourlyRate: -15 });
    await expect(useCase.execute(mockRecruiterId, dtoNeg)).rejects.toThrow(
      ApplicationValidationError,
    );
  });

  it('throws ApplicationValidationError if fixed job has hourlyRate provided', async () => {
    const dto = createValidDto({
      paymentStructure: PaymentStructure.FIXED,
      budgetAmount: 500,
      hourlyRate: 25,
    });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'hourlyRate is not allowed for fixed price jobs',
    );
  });

  it('throws ApplicationValidationError if hourly job has budgetAmount provided', async () => {
    const dto = createValidDto({
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: 500,
      hourlyRate: 25,
    });
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'budgetAmount is not allowed for hourly jobs',
    );
  });

  it('throws ApplicationNotFoundError if job category does not exist', async () => {
    const dto = createValidDto();
    jobCategoryRepository.findById.mockResolvedValueOnce(null);

    const promise = useCase.execute(mockRecruiterId, dto);
    await expect(promise).rejects.toThrow(ApplicationNotFoundError);
    await expect(promise).rejects.toThrow('Job category not found');
    expect(skillRepository.findByIds).not.toHaveBeenCalled();
    expect(jobPostRepository.createWithSkills).not.toHaveBeenCalled();
  });

  it('throws ApplicationValidationError if duplicate skill IDs are passed', async () => {
    const dto = createValidDto({
      skillIds: [mockSkillId1, mockSkillId1],
    });
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);

    const promise = useCase.execute(mockRecruiterId, dto);
    await expect(promise).rejects.toThrow(ApplicationValidationError);
    await expect(promise).rejects.toThrow(
      'Duplicate skill IDs are not allowed',
    );
    expect(skillRepository.findByIds).not.toHaveBeenCalled();
    expect(jobPostRepository.createWithSkills).not.toHaveBeenCalled();
  });

  it('throws ApplicationValidationError if any selected skill ID does not exist in skill catalog', async () => {
    const dto = createValidDto({
      skillIds: [mockSkillId1, 'missing-skill-uuid'],
    });
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
    // Returns only mockSkillId1, missing the second one
    skillRepository.findByIds.mockResolvedValueOnce([mockSkills[0]]);

    const promise = useCase.execute(mockRecruiterId, dto);
    await expect(promise).rejects.toThrow(ApplicationValidationError);
    await expect(promise).rejects.toThrow(
      'One or more selected skills do not exist: missing-skill-uuid',
    );
    expect(jobPostRepository.createWithSkills).not.toHaveBeenCalled();
  });

  it('propagates repository error if jobPostRepository.createWithSkills rejects', async () => {
    const dto = createValidDto();
    jobCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
    skillRepository.findByIds.mockResolvedValueOnce(mockSkills);

    const dbError = new Error('Database connection lost');
    jobPostRepository.createWithSkills.mockRejectedValueOnce(dbError);

    await expect(useCase.execute(mockRecruiterId, dto)).rejects.toThrow(
      'Database connection lost',
    );
  });
});
