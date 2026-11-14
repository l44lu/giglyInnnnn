import { ApplyJobUseCase } from './apply-job.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import {
  JobApplicationEntity,
  JobApplicationStatus,
} from '../../../../domain/entities/job-application.entity';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { WorkerProfileEntity } from '../../../../domain/entities/worker-profile.entity';
import {
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';

describe('ApplyJobUseCase', () => {
  let useCase: ApplyJobUseCase;
  let mockJobPostRepository: jest.Mocked<IJobPostRepository>;
  let mockWorkerProfileRepository: jest.Mocked<IWorkerProfileRepository>;
  let mockJobApplicationRepository: jest.Mocked<IJobApplicationRepository>;

  const mockUserId = 'user-auth-uuid-1';
  const mockJobId = 'job-post-uuid-1';
  const mockWorkerProfileId = 'worker-profile-uuid-1';

  const mockWorkerProfile = new WorkerProfileEntity({
    id: mockWorkerProfileId,
    userId: mockUserId,
    headline: 'Senior Warehouse Specialist',
    yearsExperience: 5,
    responseTimeHours: 2,
    availabilityStatus: 'available',
    isOpenToWork: true,
    totalCompletedGigs: 14,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockOpenJob = new JobPostEntity({
    id: mockJobId,
    recruiterId: 'recruiter-profile-uuid-1',
    categoryId: 'category-uuid-1',
    title: 'Warehouse Associate',
    description: 'Help unload containers and organize warehouse floor.',
    workType: 'local' as any,
    paymentStructure: 'fixed' as any,
    budgetAmount: 120,
    status: JobStatus.OPEN,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  });

  const mockCreatedApplication = new JobApplicationEntity({
    id: 'job-app-uuid-1',
    jobPostId: mockJobId,
    workerId: mockWorkerProfileId,
    status: JobApplicationStatus.PENDING,
    expectedPay: 130.0,
    availableDate: new Date('2099-10-15T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T12:00:00.000Z'),
    updatedAt: new Date('2026-11-11T12:00:00.000Z'),
  });

  beforeEach(() => {
    mockJobPostRepository = {
      findById: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
      updateWithSkills: jest.fn(),
      findOpenJobs: jest.fn(),
      findOpenJobById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockWorkerProfileRepository = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockJobApplicationRepository = {
      create: jest.fn(),
      findByJobAndWorker: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ApplyJobUseCase(
      mockJobPostRepository,
      mockWorkerProfileRepository,
      mockJobApplicationRepository,
    );
  });

  describe('successful application', () => {
    it('creates an application with all optional fields and returns response DTO', async () => {
      mockWorkerProfileRepository.findByUserId.mockResolvedValue(
        mockWorkerProfile,
      );
      mockJobPostRepository.findById.mockResolvedValue(mockOpenJob);
      mockJobApplicationRepository.findByJobAndWorker.mockResolvedValue(null);
      mockJobApplicationRepository.create.mockResolvedValue(
        mockCreatedApplication,
      );

      const result = await useCase.execute(mockUserId, mockJobId, {
        expectedPay: 130.0,
        availableDate: '2099-10-15',
      });

      expect(mockWorkerProfileRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(mockJobPostRepository.findById).toHaveBeenCalledWith(mockJobId);
      expect(
        mockJobApplicationRepository.findByJobAndWorker,
      ).toHaveBeenCalledWith(mockJobId, mockWorkerProfileId);

      expect(mockJobApplicationRepository.create).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        workerId: mockWorkerProfileId,
        status: JobApplicationStatus.PENDING,
        expectedPay: 130.0,
        availableDate: new Date(Date.UTC(2099, 9, 15)),
        reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
        changedByUserId: mockUserId,
      });

      expect(result).toEqual({
        id: 'job-app-uuid-1',
        jobPostId: mockJobId,
        status: JobApplicationStatus.PENDING,
        expectedPay: 130.0,
        availableDate: new Date('2099-10-15T00:00:00.000Z'),
        appliedAt: new Date('2026-11-11T12:00:00.000Z'),
        updatedAt: new Date('2026-11-11T12:00:00.000Z'),
      });
      expect(result).not.toHaveProperty('reasonCode');
      expect(result).not.toHaveProperty('changedByUserId');
      expect(result).not.toHaveProperty('statusHistory');
    });

    it('creates an application when optional fields are omitted', async () => {
      const minimalApp = new JobApplicationEntity({
        id: 'job-app-uuid-2',
        jobPostId: mockJobId,
        workerId: mockWorkerProfileId,
        status: JobApplicationStatus.PENDING,
        expectedPay: null,
        availableDate: null,
        appliedAt: new Date('2026-11-11T12:00:00.000Z'),
        updatedAt: new Date('2026-11-11T12:00:00.000Z'),
      });

      mockWorkerProfileRepository.findByUserId.mockResolvedValue(
        mockWorkerProfile,
      );
      mockJobPostRepository.findById.mockResolvedValue(mockOpenJob);
      mockJobApplicationRepository.findByJobAndWorker.mockResolvedValue(null);
      mockJobApplicationRepository.create.mockResolvedValue(minimalApp);

      const result = await useCase.execute(mockUserId, mockJobId);

      expect(mockJobApplicationRepository.create).toHaveBeenCalledWith({
        jobPostId: mockJobId,
        workerId: mockWorkerProfileId,
        status: JobApplicationStatus.PENDING,
        expectedPay: null,
        availableDate: null,
        reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
        changedByUserId: mockUserId,
      });

      expect(result.status).toBe(JobApplicationStatus.PENDING);
      expect(result.expectedPay).toBeNull();
      expect(result.availableDate).toBeNull();
    });

    it('always assigns PENDING status regardless of client input', async () => {
      mockWorkerProfileRepository.findByUserId.mockResolvedValue(
        mockWorkerProfile,
      );
      mockJobPostRepository.findById.mockResolvedValue(mockOpenJob);
      mockJobApplicationRepository.findByJobAndWorker.mockResolvedValue(null);
      mockJobApplicationRepository.create.mockResolvedValue(
        mockCreatedApplication,
      );

      // Even if a raw object with status or workerId attempted to pass through
      await useCase.execute(mockUserId, mockJobId, {
        expectedPay: 100,
      } as any);

      expect(mockJobApplicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobApplicationStatus.PENDING,
          workerId: mockWorkerProfileId,
          reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          changedByUserId: mockUserId,
        }),
      );
    });
  });

  describe('worker profile resolution', () => {
    it('throws ApplicationNotFoundError when worker profile is missing', async () => {
      mockWorkerProfileRepository.findByUserId.mockResolvedValue(null);

      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        ApplicationNotFoundError,
      );
      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        'Worker profile not found. Please complete your profile before applying.',
      );
      expect(mockJobPostRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('job existence and status verification', () => {
    it('throws ApplicationNotFoundError when job does not exist', async () => {
      mockWorkerProfileRepository.findByUserId.mockResolvedValue(
        mockWorkerProfile,
      );
      mockJobPostRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        ApplicationNotFoundError,
      );
      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        'Job post not found',
      );
      expect(
        mockJobApplicationRepository.findByJobAndWorker,
      ).not.toHaveBeenCalled();
    });

    it.each([
      JobStatus.DRAFT,
      JobStatus.PAUSED,
      JobStatus.CANCELLED,
      JobStatus.FILLED,
      JobStatus.COMPLETED,
    ])(
      'throws ApplicationConflictError when job status is %s',
      async (status) => {
        mockWorkerProfileRepository.findByUserId.mockResolvedValue(
          mockWorkerProfile,
        );
        mockJobPostRepository.findById.mockResolvedValue(
          new JobPostEntity({
            ...mockOpenJob,
            status,
          }),
        );

        await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
          ApplicationConflictError,
        );
        await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
          'Cannot apply to a job that is not open',
        );
        expect(
          mockJobApplicationRepository.findByJobAndWorker,
        ).not.toHaveBeenCalled();
      },
    );
  });

  describe('duplicate application prevention', () => {
    it('throws ApplicationConflictError when worker has already applied', async () => {
      mockWorkerProfileRepository.findByUserId.mockResolvedValue(
        mockWorkerProfile,
      );
      mockJobPostRepository.findById.mockResolvedValue(mockOpenJob);
      mockJobApplicationRepository.findByJobAndWorker.mockResolvedValue(
        mockCreatedApplication,
      );

      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        ApplicationConflictError,
      );
      await expect(useCase.execute(mockUserId, mockJobId)).rejects.toThrow(
        'You have already applied for this job',
      );
      expect(mockJobApplicationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('identifier validation', () => {
    it('throws ApplicationValidationError when userId is empty', async () => {
      await expect(useCase.execute('', mockJobId)).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute('   ', mockJobId)).rejects.toThrow(
        'userId must be a non-empty string',
      );
    });

    it('throws ApplicationValidationError when jobId is empty', async () => {
      await expect(useCase.execute(mockUserId, '')).rejects.toThrow(
        ApplicationValidationError,
      );
      await expect(useCase.execute(mockUserId, '   ')).rejects.toThrow(
        'jobId must be a non-empty string',
      );
    });
  });

  describe('input payload validation in use case', () => {
    it('throws ApplicationValidationError when expectedPay is zero or negative', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, { expectedPay: 0 }),
      ).rejects.toThrow(ApplicationValidationError);

      await expect(
        useCase.execute(mockUserId, mockJobId, { expectedPay: -10 }),
      ).rejects.toThrow('expectedPay must be greater than 0');
    });

    it('throws ApplicationValidationError when expectedPay exceeds max value', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, { expectedPay: 100000000 }),
      ).rejects.toThrow('expectedPay cannot exceed 99999999.99');
    });

    it('throws ApplicationValidationError when expectedPay has > 2 decimals', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, { expectedPay: 45.678 }),
      ).rejects.toThrow('expectedPay cannot have more than 2 decimal places');
    });

    it('throws ApplicationValidationError when expectedPay is not a number', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, {
          expectedPay: 'not-a-num' as any,
        }),
      ).rejects.toThrow('expectedPay must be a valid number');
    });

    it('throws ApplicationValidationError when availableDate is invalid format', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, {
          availableDate: '2026/12/31',
        }),
      ).rejects.toThrow('availableDate must be in YYYY-MM-DD format');
    });

    it('throws ApplicationValidationError when availableDate is invalid calendar date', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, {
          availableDate: '2099-02-30',
        }),
      ).rejects.toThrow('availableDate is not a valid calendar date');
    });

    it('throws ApplicationValidationError when availableDate is in the past', async () => {
      await expect(
        useCase.execute(mockUserId, mockJobId, {
          availableDate: '2020-01-01',
        }),
      ).rejects.toThrow('availableDate cannot be in the past');
    });

    describe('timezone-consistent availableDate validation in use case', () => {
      beforeEach(() => {
        mockWorkerProfileRepository.findByUserId.mockResolvedValue(
          mockWorkerProfile,
        );
        mockJobPostRepository.findById.mockResolvedValue(mockOpenJob);
        mockJobApplicationRepository.findByJobAndWorker.mockResolvedValue(null);
        mockJobApplicationRepository.create.mockResolvedValue(
          mockCreatedApplication,
        );
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('allows local today in negative UTC offset (UTC-8) across UTC midnight', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-11-12T04:00:00.000Z'));

        await useCase.execute(mockUserId, mockJobId, {
          availableDate: '2026-11-11',
          timezoneOffsetMinutes: 480,
        });

        expect(mockJobApplicationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            availableDate: new Date(Date.UTC(2026, 10, 11)),
          }),
        );
      });

      it('rejects local yesterday in positive UTC offset (UTC+9) even if same as UTC date', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-11-12T20:00:00.000Z'));

        await expect(
          useCase.execute(mockUserId, mockJobId, {
            availableDate: '2026-11-12',
            timezoneOffsetMinutes: -540,
          }),
        ).rejects.toThrow('availableDate cannot be in the past');
      });

      it('rejects invalid timezoneOffsetMinutes values cleanly', async () => {
        await expect(
          useCase.execute(mockUserId, mockJobId, {
            availableDate: '2099-01-01',
            timezoneOffsetMinutes: 721,
          }),
        ).rejects.toThrow(
          'timezoneOffsetMinutes must be an integer between -840 and 720',
        );
      });
    });
  });
});
