import { RejectJobApplicationUseCase } from './reject-job-application.use-case';
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

describe('RejectJobApplicationUseCase', () => {
  let useCase: RejectJobApplicationUseCase;
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
    yearsExperience: 4,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const rejectedEntity = new JobApplicationEntity({
    id: applicationId,
    jobPostId,
    workerId: 'worker-profile-uuid-1',
    status: JobApplicationStatus.REJECTED,
    expectedPay: 35,
    availableDate: new Date('2026-12-20T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T10:00:00.000Z'),
    updatedAt: new Date('2026-11-12T10:30:00.000Z'),
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
      rejectApplication: jest.fn().mockResolvedValue({
        application: rejectedEntity,
        previousStatus: JobApplicationStatus.SHORTLISTED,
        jobStatus: JobStatus.PAUSED,
      }),
      acceptApplication: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new RejectJobApplicationUseCase(
      recruiterProfileRepository,
      jobApplicationRepository,
    );
  });

  it('resolves recruiter from authenticated userId, delegates to rejectApplication, and returns explicit result', async () => {
    const result = await useCase.execute({
      userId,
      jobPostId,
      applicationId,
      reasonNote: '  Shift availability mismatch  ',
    });

    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      userId,
    );
    expect(jobApplicationRepository.rejectApplication).toHaveBeenCalledWith({
      jobPostId,
      applicationId,
      recruiterId,
      changedByUserId: userId,
      reasonNote: 'Shift availability mismatch',
    });
    expect(result).toEqual({
      applicationId,
      jobPostId,
      previousStatus: JobApplicationStatus.SHORTLISTED,
      status: JobApplicationStatus.REJECTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_REJECTED,
      jobStatus: JobStatus.PAUSED,
      updatedAt: rejectedEntity.updatedAt,
    });
  });

  it('throws ApplicationValidationError when reasonNote is non-string or IDs are invalid', async () => {
    await expect(
      useCase.execute({
        userId,
        jobPostId,
        applicationId,
        reasonNote: 123 as unknown as string,
      }),
    ).rejects.toThrow(ApplicationValidationError);

    await expect(
      useCase.execute({
        userId,
        jobPostId,
        applicationId: ' ',
      }),
    ).rejects.toThrow(ApplicationValidationError);
  });

  it('throws ApplicationNotFoundError when recruiter profile or application is missing', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);

    jobApplicationRepository.rejectApplication.mockRejectedValueOnce(
      new ApplicationNotFoundError('Job application not found'),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('propagates cross-recruiter authorization failures', async () => {
    jobApplicationRepository.rejectApplication.mockRejectedValueOnce(
      new ApplicationAuthorizationError(
        'You do not have permission to manage applications for this job',
      ),
    );

    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationAuthorizationError);
  });

  it('maps InvalidJobApplicationTransitionError and conflict states to ApplicationConflictError', async () => {
    jobApplicationRepository.rejectApplication.mockRejectedValueOnce(
      new InvalidJobApplicationTransitionError(
        'Cannot transition job application from "accepted" to "rejected"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);

    jobApplicationRepository.rejectApplication.mockRejectedValueOnce(
      new ApplicationConflictError(
        'Cannot update application status when job status is "cancelled"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);
  });
});
