import { GetJobApplicationsUseCase } from './get-job-applications.use-case';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import {
  FindJobApplicationsResult,
  IJobApplicationRepository,
  JobApplicationSortBy,
} from '../../../../domain/repositories/job-application.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobApplicationStatus } from '../../../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { GetJobApplicationsQueryDto } from '../../../dto/job-posting/get-job-applications-query.dto';
import {
  ApplicationAuthorizationError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';

describe('GetJobApplicationsUseCase', () => {
  let useCase: GetJobApplicationsUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;
  let jobApplicationRepository: jest.Mocked<IJobApplicationRepository>;

  const mockUserId = 'user-uuid-recruiter-1';
  const mockRecruiterProfileId = 'recruiter-profile-uuid-1';
  const otherRecruiterProfileId = 'recruiter-profile-uuid-2';
  const mockJobId = 'job-post-uuid-1';

  const mockRecruiterProfile = new RecruiterProfileEntity({
    id: mockRecruiterProfileId,
    userId: mockUserId,
    companyId: 'company-uuid-1',
    roleTitle: 'Hiring Manager',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const createMockJob = (overrides?: Partial<JobPostEntity>): JobPostEntity =>
    new JobPostEntity({
      id: mockJobId,
      recruiterId: mockRecruiterProfileId,
      categoryId: 'category-uuid-1',
      title: 'Event Setup Helper',
      description: 'Assist with event staging and breakdown.',
      workType: WorkType.LOCAL,
      workersNeeded: 2,
      paymentStructure: PaymentStructure.HOURLY,
      hourlyRate: 25,
      status: JobStatus.OPEN,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      ...overrides,
    });

  const sampleRepoResult: FindJobApplicationsResult = {
    job: {
      id: mockJobId,
      title: 'Event Setup Helper',
      status: JobStatus.OPEN,
      workersNeeded: 2,
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 25,
      acceptedCount: 1,
    },
    summary: {
      total: 3,
      pending: 1,
      shortlisted: 1,
      accepted: 1,
      rejected: 0,
      withdrawn: 0,
    },
    total: 3,
    page: 1,
    limit: 10,
    items: [
      {
        id: 'app-uuid-1',
        jobPostId: mockJobId,
        status: JobApplicationStatus.PENDING,
        expectedPay: 26,
        availableDate: new Date('2026-12-20T00:00:00.000Z'),
        appliedAt: new Date('2026-11-11T10:00:00.000Z'),
        updatedAt: new Date('2026-11-11T10:00:00.000Z'),
        worker: {
          id: 'worker-profile-uuid-1',
          firstName: 'Jane',
          lastName: 'Doe',
          location: 'Austin, TX',
          bio: 'Experienced helper',
          headline: 'Stage Crew',
          yearsExperience: 3,
          responseTimeHours: 1,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 8,
          hasAvatar: true,
          skills: [{ id: 'skill-1', name: 'Staging', skillType: 'CORE' }],
        },
        historySummary: {
          lastChangedAt: new Date('2026-11-11T10:00:00.000Z'),
          latestReasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          transitionCount: 1,
        },
      },
    ],
  };

  beforeEach(() => {
    recruiterProfileRepository = {
      findByUserId: jest.fn().mockResolvedValue(mockRecruiterProfile),
      upsert: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    jobPostRepository = {
      findById: jest.fn().mockResolvedValue(createMockJob()),
      findByIdWithSkills: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      updateWithSkills: jest.fn(),
      findOpenJobs: jest.fn(),
      findOpenJobById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    jobApplicationRepository = {
      create: jest.fn(),
      findByJobAndWorker: jest.fn(),
      findByJobPostId: jest.fn().mockResolvedValue(sampleRepoResult),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetJobApplicationsUseCase(
      recruiterProfileRepository,
      jobPostRepository,
      jobApplicationRepository,
    );
  });

  describe('1. Validation', () => {
    it('throws ApplicationValidationError when userId is missing or blank', async () => {
      await expect(useCase.execute('', mockJobId)).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute('   ', mockJobId)).rejects.toThrow(
        'User ID is required',
      );
    });

    it('throws ApplicationValidationError when jobPostId is missing or blank', async () => {
      await expect(useCase.execute(mockUserId, '')).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute(mockUserId, '   ')).rejects.toThrow(
        'Job post ID is required',
      );
    });

    it('throws ApplicationValidationError for invalid query parameters', async () => {
      await expect(
        useCase.execute(
          mockUserId,
          mockJobId,
          new GetJobApplicationsQueryDto({ page: 0 }),
        ),
      ).rejects.toThrow(ApplicationValidationError);

      await expect(
        useCase.execute(
          mockUserId,
          mockJobId,
          new GetJobApplicationsQueryDto({ limit: 51 }),
        ),
      ).rejects.toThrow(ApplicationValidationError);

      await expect(
        useCase.execute(
          mockUserId,
          mockJobId,
          new GetJobApplicationsQueryDto({ status: 'bogus' as any }),
        ),
      ).rejects.toThrow(ApplicationValidationError);

      await expect(
        useCase.execute(
          mockUserId,
          mockJobId,
          new GetJobApplicationsQueryDto({ sortBy: 'bogus' as any }),
        ),
      ).rejects.toThrow(ApplicationValidationError);
    });
  });

  describe('2. Authorization, Ownership & Not Found Handling', () => {
    it('throws ApplicationNotFoundError when authenticated user has no RecruiterProfile', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValueOnce(null);

      const promise = useCase.execute(mockUserId, mockJobId);
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Recruiter profile not found');

      expect(jobPostRepository.findById).not.toHaveBeenCalled();
      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
    });

    it('throws ApplicationNotFoundError when job post does not exist', async () => {
      jobPostRepository.findById.mockResolvedValueOnce(null);

      const promise = useCase.execute(mockUserId, mockJobId);
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Job post not found');

      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
    });

    it('throws ApplicationAuthorizationError when job belongs to another recruiter without querying applications', async () => {
      jobPostRepository.findById.mockResolvedValueOnce(
        createMockJob({ recruiterId: otherRecruiterProfileId }),
      );

      const promise = useCase.execute(mockUserId, mockJobId);
      await expect(promise).rejects.toThrow(ApplicationAuthorizationError);
      await expect(promise).rejects.toThrow(
        'You do not have permission to view applications for this job post',
      );

      expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
    });

    it('handles repository null result gracefully by throwing ApplicationNotFoundError', async () => {
      jobApplicationRepository.findByJobPostId.mockResolvedValueOnce(null);

      const promise = useCase.execute(mockUserId, mockJobId);
      await expect(promise).rejects.toThrow(ApplicationNotFoundError);
      await expect(promise).rejects.toThrow('Job post not found');
    });

    it('resolves recruiter identity from authenticated userId and ignores client-supplied properties', async () => {
      const injectedQuery = Object.assign(new GetJobApplicationsQueryDto(), {
        recruiterId: otherRecruiterProfileId,
      });

      await useCase.execute(mockUserId, mockJobId, injectedQuery);

      expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(jobApplicationRepository.findByJobPostId).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        status: undefined,
        search: undefined,
        page: 1,
        limit: 10,
        sortBy: JobApplicationSortBy.RECENT,
      });
    });
  });

  describe('3. Successful Retrieval & Query Forwarding', () => {
    it('forwards default query parameters and returns mapped response DTO', async () => {
      const result = await useCase.execute(
        `  ${mockUserId}  `,
        `  ${mockJobId}  `,
      );

      expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(jobPostRepository.findById).toHaveBeenCalledWith(mockJobId);
      expect(jobApplicationRepository.findByJobPostId).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        status: undefined,
        search: undefined,
        page: 1,
        limit: 10,
        sortBy: JobApplicationSortBy.RECENT,
      });

      expect(result.job).toEqual(sampleRepoResult.job);
      expect(result.summary).toEqual(sampleRepoResult.summary);
      expect(result.items).toEqual(sampleRepoResult.items);
      expect(result.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('forwards explicit status, trimmed search, page, limit, and sortBy parameters', async () => {
      jobApplicationRepository.findByJobPostId.mockResolvedValueOnce({
        ...sampleRepoResult,
        total: 25,
        page: 2,
        limit: 10,
      });

      const result = await useCase.execute(
        mockUserId,
        mockJobId,
        new GetJobApplicationsQueryDto({
          status: JobApplicationStatus.SHORTLISTED,
          search: '  Jane  ',
          page: 2,
          limit: 10,
          sortBy: JobApplicationSortBy.EXPECTED_PAY_DESC,
        }),
      );

      expect(jobApplicationRepository.findByJobPostId).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        status: JobApplicationStatus.SHORTLISTED,
        search: 'Jane',
        page: 2,
        limit: 10,
        sortBy: JobApplicationSortBy.EXPECTED_PAY_DESC,
      });
      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });
  });
});
