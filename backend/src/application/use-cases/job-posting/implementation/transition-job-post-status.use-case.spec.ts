import { TransitionJobPostStatusUseCase } from './transition-job-post-status.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { JobPostStatusAction } from '../interface/transition-job-post-status.use-case.interface';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';

describe('TransitionJobPostStatusUseCase', () => {
  let useCase: TransitionJobPostStatusUseCase;
  let jobPostRepository: jest.Mocked<IJobPostRepository>;

  const mockJobId = '123e4567-e89b-42d3-a456-426614174000';
  const mockRecruiterId = 'recruiter-profile-uuid-1';
  const anotherRecruiterId = 'recruiter-profile-uuid-2';

  const createMockJobPost = (status: JobStatus): JobPostEntity => {
    return new JobPostEntity({
      id: mockJobId,
      recruiterId: mockRecruiterId,
      categoryId: 'category-uuid-1',
      title: 'Senior Bartender',
      description: 'Need experienced bartender for weekend rooftop shifts.',
      workType: WorkType.LOCAL,
      workersNeeded: 2,
      paymentStructure: PaymentStructure.HOURLY,
      hourlyRate: 35,
      jobLocation: 'Chicago, IL',
      status,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  };

  beforeEach(() => {
    jobPostRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
      updateWithSkills: jest.fn(),
    };

    useCase = new TransitionJobPostStatusUseCase(jobPostRepository);
  });

  describe('Validation & Security Invariants', () => {
    it('throws ApplicationValidationError if jobPostId is missing or empty', async () => {
      await expect(
        useCase.execute('', mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute('', mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow('Job post ID is required');
    });

    it('throws ApplicationValidationError if recruiterId is missing or empty', async () => {
      await expect(
        useCase.execute(mockJobId, '   ', JobPostStatusAction.PAUSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, '   ', JobPostStatusAction.PAUSE),
      ).rejects.toThrow('Recruiter profile ID is required');
    });

    it('throws ApplicationValidationError if action is invalid', async () => {
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, 'invalid-action' as any),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, 'invalid-action' as any),
      ).rejects.toThrow('Invalid status transition action');
    });

    it('throws ApplicationNotFoundError if job post does not exist', async () => {
      jobPostRepository.findByIdWithSkills.mockResolvedValue(null);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow(ApplicationNotFoundError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow('Job post not found');
    });

    it('throws ApplicationAuthorizationError if recruiter does not own the job post', async () => {
      const existingJob = createMockJobPost(JobStatus.OPEN);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(
          mockJobId,
          anotherRecruiterId,
          JobPostStatusAction.PAUSE,
        ),
      ).rejects.toThrow(ApplicationAuthorizationError);
      await expect(
        useCase.execute(
          mockJobId,
          anotherRecruiterId,
          JobPostStatusAction.PAUSE,
        ),
      ).rejects.toThrow('You do not have permission to modify this job post');
    });
  });

  describe('Action: PAUSE', () => {
    it('successfully pauses an OPEN job post (OPEN -> PAUSED)', async () => {
      const existingJob = createMockJobPost(JobStatus.OPEN);
      const updatedJob = createMockJobPost(JobStatus.PAUSED);

      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);
      jobPostRepository.update.mockResolvedValue(updatedJob);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        JobPostStatusAction.PAUSE,
      );

      expect(jobPostRepository.findByIdWithSkills).toHaveBeenCalledWith(
        mockJobId,
      );
      expect(jobPostRepository.update).toHaveBeenCalledWith(mockJobId, {
        status: JobStatus.PAUSED,
      });
      expect(result.status).toBe(JobStatus.PAUSED);
    });

    it('throws ApplicationValidationError when attempting to pause an already PAUSED job', async () => {
      const existingJob = createMockJobPost(JobStatus.PAUSED);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow('Job post is already paused');
    });

    it('throws ApplicationValidationError when attempting to pause a DRAFT job', async () => {
      const existingJob = createMockJobPost(JobStatus.DRAFT);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.PAUSE),
      ).rejects.toThrow('Draft job posts cannot be paused');
    });

    it('throws ApplicationValidationError when attempting to pause a FILLED, COMPLETED, or CANCELLED job', async () => {
      const nonPausableStatuses = [
        JobStatus.FILLED,
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
      ];

      for (const status of nonPausableStatuses) {
        const existingJob = createMockJobPost(status);
        jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

        await expect(
          useCase.execute(
            mockJobId,
            mockRecruiterId,
            JobPostStatusAction.PAUSE,
          ),
        ).rejects.toThrow(ApplicationValidationError);
      }
    });
  });

  describe('Action: REOPEN', () => {
    it('successfully reopens a PAUSED job post (PAUSED -> OPEN)', async () => {
      const existingJob = createMockJobPost(JobStatus.PAUSED);
      const updatedJob = createMockJobPost(JobStatus.OPEN);

      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);
      jobPostRepository.update.mockResolvedValue(updatedJob);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        JobPostStatusAction.REOPEN,
      );

      expect(jobPostRepository.findByIdWithSkills).toHaveBeenCalledWith(
        mockJobId,
      );
      expect(jobPostRepository.update).toHaveBeenCalledWith(mockJobId, {
        status: JobStatus.OPEN,
      });
      expect(result.status).toBe(JobStatus.OPEN);
    });

    it('throws ApplicationValidationError when attempting to reopen an already OPEN job', async () => {
      const existingJob = createMockJobPost(JobStatus.OPEN);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.REOPEN),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.REOPEN),
      ).rejects.toThrow('Job post is already open');
    });

    it('throws ApplicationValidationError when attempting to reopen a DRAFT job', async () => {
      const existingJob = createMockJobPost(JobStatus.DRAFT);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.REOPEN),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.REOPEN),
      ).rejects.toThrow('Draft job posts cannot be reopened');
    });

    it('throws ApplicationValidationError when attempting to reopen a FILLED, COMPLETED, or CANCELLED job', async () => {
      const nonReopenableStatuses = [
        JobStatus.FILLED,
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
      ];

      for (const status of nonReopenableStatuses) {
        const existingJob = createMockJobPost(status);
        jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

        await expect(
          useCase.execute(
            mockJobId,
            mockRecruiterId,
            JobPostStatusAction.REOPEN,
          ),
        ).rejects.toThrow(ApplicationValidationError);
      }
    });
  });

  describe('Action: CLOSE', () => {
    it('successfully closes an OPEN job post (OPEN -> CANCELLED)', async () => {
      const existingJob = createMockJobPost(JobStatus.OPEN);
      const updatedJob = createMockJobPost(JobStatus.CANCELLED);

      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);
      jobPostRepository.update.mockResolvedValue(updatedJob);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        JobPostStatusAction.CLOSE,
      );

      expect(jobPostRepository.findByIdWithSkills).toHaveBeenCalledWith(
        mockJobId,
      );
      expect(jobPostRepository.update).toHaveBeenCalledWith(mockJobId, {
        status: JobStatus.CANCELLED,
      });
      expect(result.status).toBe(JobStatus.CANCELLED);
    });

    it('successfully closes a PAUSED job post (PAUSED -> CANCELLED)', async () => {
      const existingJob = createMockJobPost(JobStatus.PAUSED);
      const updatedJob = createMockJobPost(JobStatus.CANCELLED);

      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);
      jobPostRepository.update.mockResolvedValue(updatedJob);

      const result = await useCase.execute(
        mockJobId,
        mockRecruiterId,
        JobPostStatusAction.CLOSE,
      );

      expect(jobPostRepository.update).toHaveBeenCalledWith(mockJobId, {
        status: JobStatus.CANCELLED,
      });
      expect(result.status).toBe(JobStatus.CANCELLED);
    });

    it('throws ApplicationValidationError when attempting to close an already CANCELLED job', async () => {
      const existingJob = createMockJobPost(JobStatus.CANCELLED);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.CLOSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.CLOSE),
      ).rejects.toThrow('Job post is already closed');
    });

    it('throws ApplicationValidationError when attempting to close a DRAFT job', async () => {
      const existingJob = createMockJobPost(JobStatus.DRAFT);
      jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.CLOSE),
      ).rejects.toThrow(ApplicationValidationError);
      await expect(
        useCase.execute(mockJobId, mockRecruiterId, JobPostStatusAction.CLOSE),
      ).rejects.toThrow('Draft job posts cannot be closed');
    });

    it('throws ApplicationValidationError when attempting to close a FILLED or COMPLETED job', async () => {
      const nonClosableStatuses = [JobStatus.FILLED, JobStatus.COMPLETED];

      for (const status of nonClosableStatuses) {
        const existingJob = createMockJobPost(status);
        jobPostRepository.findByIdWithSkills.mockResolvedValue(existingJob);

        await expect(
          useCase.execute(
            mockJobId,
            mockRecruiterId,
            JobPostStatusAction.CLOSE,
          ),
        ).rejects.toThrow(ApplicationValidationError);
      }
    });
  });
});
