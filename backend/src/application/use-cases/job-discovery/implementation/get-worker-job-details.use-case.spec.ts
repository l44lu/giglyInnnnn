import { GetWorkerJobDetailsUseCase } from './get-worker-job-details.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import {
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';

describe('GetWorkerJobDetailsUseCase', () => {
  let useCase: GetWorkerJobDetailsUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;

  const mockOpenJob = new JobPostEntity({
    id: 'job-uuid-1',
    recruiterId: 'recruiter-uuid-1',
    categoryId: 'category-uuid-1',
    title: 'Warehouse Shift Helper',
    description: 'Help unload cartons and organize shelves',
    workType: WorkType.LOCAL,
    workersNeeded: 4,
    startDate: new Date('2026-05-10T19:00:00.000Z'),
    estimatedDuration: 'Less than 1 day',
    shiftDuration: '6 hours',
    jobLocation: '2458 Harbor South Road, South Seattle',
    jobLocationLat: 47.58,
    jobLocationLng: -122.35,
    paymentStructure: PaymentStructure.FIXED,
    budgetAmount: 120,
    hourlyRate: null,
    status: JobStatus.OPEN,
    isBoosted: true,
    boostExpiresAt: new Date('2026-06-01T00:00:00.000Z'),
    adminReviewStatus: 'approved',
    adminNotes: 'Admin internal note: verified company',
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: new Date('2026-05-02T12:00:00.000Z'),
    category: new JobCategoryEntity({
      id: 'category-uuid-1',
      name: 'Logistics & Warehousing',
      description: 'Physical warehouse operations',
    }),
    skills: [
      new SkillEntity({ id: 'skill-1', name: 'Heavy lifting' }),
      new SkillEntity({ id: 'skill-2', name: 'Punctuality' }),
    ],
    company: new CompanyEntity({
      id: 'company-uuid-1',
      name: 'SwiftPack Storage',
      logoUrl: 'https://cdn.example.com/logo.png',
      about: 'Fast local storage operations',
      industry: 'Logistics',
      website: 'https://swiftpack.example.com',
      headquartersLocation: 'Seattle, WA',
    }),
    recruiter: new RecruiterProfileEntity({
      id: 'recruiter-uuid-1',
      userId: 'user-uuid-1',
      roleTitle: 'Senior Recruiter at SwiftPack',
      yearsExperience: 7,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      user: new UserEntities({
        id: 'user-uuid-1',
        email: 'private.recruiter@example.com',
        passWordHash: 'secret-hash',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        phone: '+1-555-123-4567',
        avatarUrl: 'https://cdn.example.com/sarah.jpg',
        location: 'Chicago, IL',
        bio: 'Hospitality and event staffing recruiter.',
      }),
    }),
  });

  beforeEach(() => {
    jobPostRepository = {
      findOpenJobById: jest.fn(),
      findOpenJobs: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
      updateWithSkills: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetWorkerJobDetailsUseCase(jobPostRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns correctly mapped public details for an existing OPEN job', async () => {
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(mockOpenJob);

    const result = await useCase.execute('job-uuid-1');

    expect(jobPostRepository.findOpenJobById).toHaveBeenCalledWith(
      'job-uuid-1',
    );
    expect(result.id).toBe('job-uuid-1');
    expect(result.title).toBe('Warehouse Shift Helper');
    expect(result.description).toBe('Help unload cartons and organize shelves');
    expect(result.workType).toBe(WorkType.LOCAL);
    expect(result.workersNeeded).toBe(4);
    expect(result.paymentStructure).toBe(PaymentStructure.FIXED);
    expect(result.budgetAmount).toBe(120);
    expect(result.status).toBe(JobStatus.OPEN);

    // Relations
    expect(result.category?.id).toBe('category-uuid-1');
    expect(result.category?.name).toBe('Logistics & Warehousing');
    expect(result.skills).toHaveLength(2);
    expect(result.skills?.[0].name).toBe('Heavy lifting');
    expect(result.skills?.[1].name).toBe('Punctuality');

    // Company
    expect(result.company?.id).toBe('company-uuid-1');
    expect(result.company?.name).toBe('SwiftPack Storage');
    expect(result.company?.logoUrl).toBe('https://cdn.example.com/logo.png');
    expect(result.company?.about).toBe('Fast local storage operations');
    expect(result.company?.website).toBe('https://swiftpack.example.com');
    expect(result.company?.headquartersLocation).toBe('Seattle, WA');

    // Recruiter public details
    expect(result.recruiter?.name).toBe('Sarah Jenkins');
    expect(result.recruiter?.roleTitle).toBe('Senior Recruiter at SwiftPack');
    expect(result.recruiter?.avatarUrl).toBe(
      'https://cdn.example.com/sarah.jpg',
    );
    expect(result.recruiter?.location).toBe('Chicago, IL');
    expect(result.recruiter?.bio).toBe(
      'Hospitality and event staffing recruiter.',
    );
  });

  it('strictly excludes private, sensitive, and internal database fields from output', async () => {
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(mockOpenJob);

    const result = await useCase.execute('job-uuid-1');
    const resultObj = JSON.parse(JSON.stringify(result));

    // Internal job post metadata
    expect(resultObj.adminNotes).toBeUndefined();
    expect(resultObj.adminReviewStatus).toBeUndefined();
    expect(resultObj.isBoosted).toBeUndefined();
    expect(resultObj.boostExpiresAt).toBeUndefined();
    expect(resultObj.recruiterId).toBeUndefined();

    // Sensitive recruiter data
    expect(resultObj.recruiter?.email).toBeUndefined();
    expect(resultObj.recruiter?.phone).toBeUndefined();
    expect(resultObj.recruiter?.passWordHash).toBeUndefined();
    expect(resultObj.recruiter?.id).toBeUndefined();
    expect(resultObj.recruiter?.userId).toBeUndefined();
  });

  it('throws ApplicationNotFoundError when job is not found', async () => {
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(null);

    await expect(useCase.execute('missing-job-id')).rejects.toThrow(
      ApplicationNotFoundError,
    );
  });

  it('throws ApplicationNotFoundError when returned job is not in OPEN status', async () => {
    const draftJob = new JobPostEntity({
      ...mockOpenJob,
      status: JobStatus.DRAFT,
    });
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(draftJob);

    await expect(useCase.execute('job-uuid-1')).rejects.toThrow(
      ApplicationNotFoundError,
    );
  });

  it('throws ApplicationValidationError when job ID is empty or whitespace', async () => {
    await expect(useCase.execute('')).rejects.toThrow(
      ApplicationValidationError,
    );
    await expect(useCase.execute('   ')).rejects.toThrow(
      ApplicationValidationError,
    );
  });

  it('safely handles missing/null category, skills, company, and recruiter', async () => {
    const bareJob = new JobPostEntity({
      ...mockOpenJob,
      category: undefined,
      skills: undefined,
      company: null,
      recruiter: null,
    });
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(bareJob);

    const result = await useCase.execute('job-uuid-1');

    expect(result.category).toBeUndefined();
    expect(result.skills).toBeUndefined();
    expect(result.company).toBeNull();
    expect(result.recruiter).toBeNull();
  });

  it('handles recruiter with missing user details gracefully', async () => {
    const jobWithBareRecruiter = new JobPostEntity({
      ...mockOpenJob,
      recruiter: new RecruiterProfileEntity({
        id: 'recruiter-uuid-1',
        userId: 'user-uuid-1',
        roleTitle: 'Hiring Lead',
        user: null,
      }),
    });
    jobPostRepository.findOpenJobById.mockResolvedValueOnce(
      jobWithBareRecruiter,
    );

    const result = await useCase.execute('job-uuid-1');

    expect(result.recruiter?.name).toBe('Recruiter');
    expect(result.recruiter?.roleTitle).toBe('Hiring Lead');
    expect(result.recruiter?.avatarUrl).toBeNull();
    expect(result.recruiter?.location).toBeNull();
    expect(result.recruiter?.bio).toBeNull();
  });
});
