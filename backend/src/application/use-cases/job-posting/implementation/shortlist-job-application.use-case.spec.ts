import { ShortlistJobApplicationUseCase } from './shortlist-job-application.use-case';
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

describe('ShortlistJobApplicationUseCase', () => {
  let useCase: ShortlistJobApplicationUseCase;
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

  const shortlistedEntity = new JobApplicationEntity({
    id: applicationId,
    jobPostId,
    workerId: 'worker-profile-uuid-1',
    status: JobApplicationStatus.SHORTLISTED,
    expectedPay: 28,
    availableDate: new Date('2026-12-20T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T10:00:00.000Z'),
    updatedAt: new Date('2026-11-12T10:00:00.000Z'),
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
      shortlistApplication: jest.fn().mockResolvedValue({
        application: shortlistedEntity,
        previousStatus: JobApplicationStatus.PENDING,
        jobStatus: JobStatus.OPEN,
      }),
      rejectApplication: jest.fn(),
      acceptApplication: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ShortlistJobApplicationUseCase(
      recruiterProfileRepository,
      jobApplicationRepository,
    );
  });

  it('resolves recruiter from authenticated userId, delegates to shortlistApplication, and returns explicit result', async () => {
    const command = {
      userId: `  ${userId}  `,
      jobPostId: `  ${jobPostId}  `,
      applicationId: `  ${applicationId}  `,
      reasonNote: '  Strong forklift certifications  ',
      recruiterId: 'attacker-spoofed-recruiter-id',
    };

    const result = await useCase.execute(command);

    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      userId,
    );
    expect(jobApplicationRepository.shortlistApplication).toHaveBeenCalledWith({
      jobPostId,
      applicationId,
      recruiterId,
      changedByUserId: userId,
      reasonNote: 'Strong forklift certifications',
    });
    expect(result).toEqual({
      applicationId,
      jobPostId,
      previousStatus: JobApplicationStatus.PENDING,
      status: JobApplicationStatus.SHORTLISTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
      jobStatus: JobStatus.OPEN,
      updatedAt: shortlistedEntity.updatedAt,
    });
  });

  it('throws ApplicationValidationError when required IDs are blank or reasonNote is invalid', async () => {
    await expect(
      useCase.execute({
        userId: '  ',
        jobPostId,
        applicationId,
      }),
    ).rejects.toThrow(ApplicationValidationError);

    await expect(
      useCase.execute({
        userId,
        jobPostId: '',
        applicationId,
      }),
    ).rejects.toThrow(ApplicationValidationError);

    await expect(
      useCase.execute({
        userId,
        jobPostId,
        applicationId: '',
      }),
    ).rejects.toThrow(ApplicationValidationError);

    expect(recruiterProfileRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('throws ApplicationNotFoundError when recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);
    expect(
      jobApplicationRepository.shortlistApplication,
    ).not.toHaveBeenCalled();
  });

  it('propagates cross-recruiter authorization and missing job/application failures cleanly', async () => {
    jobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
      new ApplicationAuthorizationError(
        'You do not have permission to manage applications for this job',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationAuthorizationError);

    jobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
      new ApplicationNotFoundError('Job application not found'),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('maps InvalidJobApplicationTransitionError and conflict states to ApplicationConflictError', async () => {
    jobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
      new InvalidJobApplicationTransitionError(
        'Cannot transition job application from "shortlisted" to "shortlisted"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);

    jobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
      new ApplicationConflictError(
        'Cannot update application status when job status is "filled"',
      ),
    );
    await expect(
      useCase.execute({ userId, jobPostId, applicationId }),
    ).rejects.toThrow(ApplicationConflictError);
  });

  it('sanitizes Prisma client errors without leaking raw database internals', async () => {
    const prismaError = Object.assign(new Error('Raw Prisma internal text'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2003',
    });
    jobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
      prismaError,
    );

    const promise = useCase.execute({ userId, jobPostId, applicationId });
    await expect(promise).rejects.toThrow(ApplicationConflictError);
    await expect(promise).rejects.not.toThrow('Raw Prisma internal text');
  });
});
