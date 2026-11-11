import { Test, TestingModule } from '@nestjs/testing';
import { FindOpenJobsUseCase } from './find-open-jobs.use-case';
import {
  IJobPostRepository,
  JobSortBy,
} from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../../../domain/entities/job-category.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { FindJobsQueryDto } from '../../../dto/job-discovery/find-jobs-query.dto';
import { ApplicationValidationError } from '../../../errors/application.errors';

describe('FindOpenJobsUseCase', () => {
  let useCase: FindOpenJobsUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;

  const mockCategory = new JobCategoryEntity({
    id: 'category-uuid-1',
    name: 'Events & Hospitality',
    description: 'Event jobs',
  });

  const mockSkills = [
    new SkillEntity({
      id: 'skill-uuid-1',
      name: 'Bartending',
    }),
    new SkillEntity({
      id: 'skill-uuid-2',
      name: 'Customer Service',
    }),
  ];

  const mockCompany = new CompanyEntity({
    id: 'company-uuid-1',
    name: 'Apex Events Co',
    logoUrl: 'https://cdn.example.com/logo.png',
  });

  const mockOpenJobWithCompany = new JobPostEntity({
    id: 'job-uuid-1',
    recruiterId: 'recruiter-uuid-1',
    categoryId: 'category-uuid-1',
    title: 'Lead Event Bartender',
    description: 'Provide bartending service at a wedding.',
    workType: WorkType.LOCAL,
    workersNeeded: 2,
    startDate: new Date('2026-07-01T18:00:00.000Z'),
    estimatedDuration: '6 hours',
    shiftDuration: '6h',
    jobLocation: 'Chicago, IL',
    paymentStructure: PaymentStructure.HOURLY,
    hourlyRate: 35,
    hourlyRateMin: 35,
    hourlyRateMax: 35,
    status: JobStatus.OPEN,
    isBoosted: true,
    boostExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
    adminReviewStatus: 'APPROVED',
    adminNotes: 'Confidential internal reviewer notes',
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    category: mockCategory,
    skills: mockSkills,
    company: mockCompany,
  });

  const mockOpenJobWithoutCompany = new JobPostEntity({
    id: 'job-uuid-2',
    recruiterId: 'recruiter-uuid-2',
    categoryId: 'category-uuid-1',
    title: 'Festival Security Staff',
    description: 'Crowd control for summer festival.',
    workType: WorkType.LOCAL,
    workersNeeded: 5,
    paymentStructure: PaymentStructure.FIXED,
    budgetAmount: 500,
    status: JobStatus.OPEN,
    isBoosted: false,
    adminReviewStatus: 'PENDING',
    adminNotes: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    category: mockCategory,
    skills: [],
    company: null,
  });

  beforeEach(async () => {
    jobPostRepository = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOpenJobsUseCase,
        {
          provide: IJobPostRepository,
          useValue: jobPostRepository,
        },
      ],
    }).compile();

    useCase = module.get<FindOpenJobsUseCase>(FindOpenJobsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Successful Retrieval & Mapping', () => {
    it('executes repository query and maps job fields, category, skills, company and pagination', async () => {
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [mockOpenJobWithCompany, mockOpenJobWithoutCompany],
        total: 2,
      });

      const query = new FindJobsQueryDto({
        search: 'Bartender',
        categoryId: 'category-uuid-1',
        workType: WorkType.LOCAL,
        location: 'Chicago',
        paymentStructure: PaymentStructure.HOURLY,
        minPay: 20,
        maxPay: 50,
        skillIds: ['skill-uuid-1'],
        sortBy: JobSortBy.PAY_HIGH,
        page: 1,
        limit: 10,
      });

      const response = await useCase.execute(query);

      expect(jobPostRepository.findOpenJobs).toHaveBeenCalledTimes(1);
      expect(jobPostRepository.findOpenJobs).toHaveBeenCalledWith({
        search: 'Bartender',
        categoryId: 'category-uuid-1',
        workType: WorkType.LOCAL,
        location: 'Chicago',
        paymentStructure: PaymentStructure.HOURLY,
        minPay: 20,
        maxPay: 50,
        skillIds: ['skill-uuid-1'],
        sortBy: JobSortBy.PAY_HIGH,
        page: 1,
        limit: 10,
      });

      expect(response.pagination.total).toBe(2);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.totalPages).toBe(1);
      expect(response.items).toHaveLength(2);

      // Verify item 1 with company
      const item1 = response.items[0];
      expect(item1.id).toBe('job-uuid-1');
      expect(item1.title).toBe('Lead Event Bartender');
      expect(item1.hourlyRate).toBe(35);
      expect(item1.category?.id).toBe('category-uuid-1');
      expect(item1.category?.name).toBe('Events & Hospitality');
      expect(item1.skills).toHaveLength(2);
      expect(item1.skills?.[0].name).toBe('Bartending');
      expect(item1.company).toEqual({
        id: 'company-uuid-1',
        name: 'Apex Events Co',
        logoUrl: 'https://cdn.example.com/logo.png',
      });

      // Verify item 2 without company
      const item2 = response.items[1];
      expect(item2.id).toBe('job-uuid-2');
      expect(item2.budgetAmount).toBe(500);
      expect(item2.company).toBeNull();
    });

    it('strips private recruiter data and admin metadata from response DTO', async () => {
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [mockOpenJobWithCompany],
        total: 1,
      });

      const response = await useCase.execute(new FindJobsQueryDto());
      const item = response.items[0] as unknown as Record<string, unknown>;

      // Ensure private/admin fields are NOT present
      expect(item.adminReviewStatus).toBeUndefined();
      expect(item.adminNotes).toBeUndefined();
      expect(item.isBoosted).toBeUndefined();
      expect(item.boostExpiresAt).toBeUndefined();
      expect(item.recruiterId).toBeUndefined();
      expect(item.recruiter).toBeUndefined();
    });

    it('calculates totalPages accurately across pagination boundaries', async () => {
      // 25 items with limit 10 -> 3 pages
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [mockOpenJobWithCompany],
        total: 25,
      });

      const response = await useCase.execute(
        new FindJobsQueryDto({ page: 2, limit: 10 }),
      );

      expect(response.pagination.total).toBe(25);
      expect(response.pagination.page).toBe(2);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.totalPages).toBe(3);
    });

    it('handles zero results cleanly with totalPages=0 and empty items', async () => {
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [],
        total: 0,
      });

      const response = await useCase.execute(new FindJobsQueryDto());

      expect(response.pagination.total).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
      expect(response.items).toEqual([]);
    });

    it('handles out-of-range requested page preserving page and returning empty items', async () => {
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [],
        total: 20,
      });

      const response = await useCase.execute(
        new FindJobsQueryDto({ page: 10, limit: 10 }),
      );

      expect(response.items).toEqual([]);
      expect(response.pagination.total).toBe(20);
      expect(response.pagination.page).toBe(10);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.totalPages).toBe(2);
    });

    it('maps job post entity with undefined category, skills and company safely without throwing', async () => {
      const jobWithoutRelations = new JobPostEntity({
        id: 'job-uuid-3',
        recruiterId: 'recruiter-uuid-3',
        categoryId: 'category-uuid-1',
        title: 'General Laborer',
        description: 'Physical warehouse assistance.',
        workType: WorkType.LOCAL,
        workersNeeded: 1,
        paymentStructure: PaymentStructure.HOURLY,
        hourlyRate: 20,
        status: JobStatus.OPEN,
        createdAt: new Date('2026-06-03T08:00:00.000Z'),
        updatedAt: new Date('2026-06-03T08:00:00.000Z'),
        category: undefined,
        skills: undefined,
        company: null,
      });

      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [jobWithoutRelations],
        total: 1,
      });

      const response = await useCase.execute(new FindJobsQueryDto());

      expect(response.items).toHaveLength(1);
      const item = response.items[0];
      expect(item.id).toBe('job-uuid-3');
      expect(item.title).toBe('General Laborer');
      expect(item.category).toBeUndefined();
      expect(item.skills).toBeUndefined();
      expect(item.company).toBeNull();
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws ApplicationValidationError when minPay is greater than maxPay', async () => {
      const invalidQuery = new FindJobsQueryDto({
        minPay: 100,
        maxPay: 50,
      });

      await expect(useCase.execute(invalidQuery)).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute(invalidQuery)).rejects.toThrow(
        'minPay cannot be greater than maxPay',
      );

      expect(jobPostRepository.findOpenJobs).not.toHaveBeenCalled();
    });

    it('allows minPay equal to maxPay', async () => {
      jobPostRepository.findOpenJobs.mockResolvedValue({
        items: [],
        total: 0,
      });

      const validQuery = new FindJobsQueryDto({
        minPay: 50,
        maxPay: 50,
      });

      await expect(useCase.execute(validQuery)).resolves.toBeDefined();
      expect(jobPostRepository.findOpenJobs).toHaveBeenCalledTimes(1);
    });

    it('rethrows unexpected repository errors', async () => {
      jobPostRepository.findOpenJobs.mockRejectedValue(
        new Error('Database query failure'),
      );

      await expect(useCase.execute(new FindJobsQueryDto())).rejects.toThrow(
        'Database query failure',
      );
    });
  });
});
