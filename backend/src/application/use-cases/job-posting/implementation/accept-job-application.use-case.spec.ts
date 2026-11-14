import { AcceptJobApplicationUseCase } from './accept-job-application.use-case';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import {
  InvalidJobApplicationTransitionError,
  JobApplicationEntity,
} from '../../../../domain/entities/job-application.entity';
import { JobApplicationStatus } from '../../../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';

describe('AcceptJobApplicationUseCase', () => {
  let useCase: AcceptJobApplicationUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let jobApplicationRepository: jest.Mocked<IJobApplicationRepository>;

  const userId = 'recruiter-user-uuid-1';
  const recruiterId = 'recruiter-profile-uuid-1';
  const jobPostId = 'job-post-uuid-1';
  const applicationId = 'application-uuid-1';

  const mockRecruiterProfile = new RecruiterProfileEntity({
    id: recruiterId,
    userId,
    companyId: 'company-uuid-1',
    roleTitle: 'Hiring Manager',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const acceptedEntity = new JobApplicationEntity({
    id: applicationId,
    jobPostId,
    workerId: 'worker-profile-uuid-1',
    status: JobApplicationStatus.ACCEPTED,
    expectedPay: 30,
    availableDate: new Date('2026-12-20T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T10:00:00.000Z'),
    updatedAt: new Date('2026-11-12T10:15:00.000Z'),
  });

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

    jobApplicationRepository = {
      create: jest.fn(),
      findByJobAndWorker: jest.fn(),
      findByJobPostId: jest.fn(),
      shortlistApplication: jest.fn(),
      rejectApplication: jest.fn(),
      acceptApplication: jest.fn().mockResolvedValue({
        application: acceptedEntity,
        previousStatus: JobApplicationStatus.SHORTLISTED,
        jobStatus: JobStatus.OPEN,
        workersNeeded: 2,
        acceptedCount: 1,
        jobFilled: false,
        autoRejectedCount: 0,
        autoRejectedApplicationIds: [],
      }),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new AcceptJobApplicationUseCase(
      recruiterProfileRepository,
      jobApplicationRepository,
    );
  });

  it('accepts an application without stale pre-read capacity queries when job remains open', async () => {
    const result = await useCase.execute({
      userId,
      jobPostId,
      applicationId,
      reasonNote: '  Great fit for weekend shift  ',
    });

    expect(jobApplicationRepository.findByJobPostId).not.toHaveBeenCalled();
    expect(jobApplicationRepository.acceptApplication).toHaveBeenCalledWith({
      jobPostId,
      applicationId,
      recruiterId,
      changedByUserId: userId,
      reasonNote: 'Great fit for weekend shift',
    });
    expect(result).toEqual({
      applicationId,
      jobPostId,
      previousStatus: JobApplicationStatus.SHORTLISTED,
      status: JobApplicationStatus.ACCEPTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
      jobStatus: JobStatus.OPEN,
      updatedAt: acceptedEntity.updatedAt,
      workersNeeded: 2,
      acceptedCount: 1,
      jobFilled: false,
      autoRejectedCount: 0,
      autoRejectedApplicationIds: [],
    });
  });

  it('reflects job becoming FILLED and automatic rejection details in returned result', async () => {
    jobApplicationRepository.acceptApplication.mockResolvedValueOnce({
      application: acceptedEntity,
      previousStatus: JobApplicationStatus.PENDING,
      jobStatus: JobStatus.FILLED,
      workersNeeded: 2,
      acceptedCount: 2,
      jobFilled: true,
      autoRejectedCount: 3,
      autoRejectedApplicationIds: ['app-2', 'app-3', 'app-4'],
    });

    const result = await useCase.execute({
      userId,
      jobPostId,
      applicationId,
    });

    expect(result.jobFilled).toBe(true);
    expect(result.jobStatus).toBe(JobStatus.FILLED);
    expect(result.acceptedCount).toBe(2);
    expect(result.workersNeeded).toBe(2);
    expect(result.autoRejectedCount).toBe(3);
    expect(result.autoRejectedApplicationIds).toEqual([
      'app-2',
      'app-3',
      'app-4',
    ]);
  });

  it('ignores client-supplied recruiterId and resolves recruiter from authenticated userId', async () => {
    await useCase.execute({
      userId,
      jobPostId,
      applicationId,
      recruiterId: 'spoofed-recruiter-id',
    } as any);

    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      userId,
    );
    expect(jobApplicationRepository.acceptApplication).toHaveBeenCalledWith({
      jobPostId,
      applicationId,
      recruiterId,
      changedByUserId: userId,
      reasonNote: null,
    });
  });

  it('throws ApplicationNotFoundError when recruiter profile or job/application is missing', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);

    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      new ApplicationNotFoundError('Job post not found'),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('throws ApplicationAuthorizationError on cross-recruiter ownership mismatch', async () => {
    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      new ApplicationAuthorizationError(
        'You do not have permission to manage applications for this job',
      ),
    );

    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationAuthorizationError);
  });

  it('throws ApplicationConflictError when job is not accepting applications, capacity is reached, or transition is invalid', async () => {
    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      new ApplicationConflictError(
        'Job has already reached its hiring capacity',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);

    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      new ApplicationConflictError(
        'Cannot accept applications when job status is "paused"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);

    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      new InvalidJobApplicationTransitionError(
        'Cannot transition job application from "rejected" to "accepted"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);
  });

  it('validates command inputs and sanitizes escaped Prisma P2025 errors', async () => {
    await expect(
      useCase.execute({ userId, jobPostId: '', applicationId }),
    ).rejects.toThrow(ApplicationValidationError);

    const prismaNotFound = Object.assign(
      new Error('Record to update not found'),
      {
        name: 'PrismaClientKnownRequestError',
        code: 'P2025',
      },
    );
    jobApplicationRepository.acceptApplication.mockRejectedValueOnce(
      prismaNotFound,
    );

    const promise = useCase.execute({ userId, jobPostId, applicationId });
    await expect(promise).rejects.toThrow(ApplicationNotFoundError);
    await expect(promise).rejects.not.toThrow('Record to update not found');
  });
});
