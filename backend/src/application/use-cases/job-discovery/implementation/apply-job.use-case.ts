import { Injectable, Inject } from '@nestjs/common';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { JobApplicationStatus } from '../../../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import {
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';
import { IApplyJobUseCase } from '../interface/apply-job.use-case.interface';
import {
  ApplyJobInputDto,
  getTodayDateUtcForOffset,
  isValidTimezoneOffsetMinutes,
  parseCalendarDateString,
} from '../../../dto/job-discovery/apply-job-input.dto';
import { JobApplicationResponseDto } from '../../../dto/job-discovery/job-application-response.dto';

@Injectable()
export class ApplyJobUseCase implements IApplyJobUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
    @Inject(IWorkerProfileRepository)
    private readonly workerProfileRepository: IWorkerProfileRepository,
    @Inject(IJobApplicationRepository)
    private readonly jobApplicationRepository: IJobApplicationRepository,
  ) {}

  async execute(
    userId: string,
    jobId: string,
    dto?: ApplyJobInputDto,
  ): Promise<JobApplicationResponseDto> {
    // 1. Validate required identifiers
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ApplicationValidationError('userId must be a non-empty string');
    }

    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      throw new ApplicationValidationError('jobId must be a non-empty string');
    }

    // 2. Validate optional application input
    let parsedAvailableDate: Date | null = null;
    let validatedExpectedPay: number | null = null;

    if (dto) {
      if (dto.expectedPay !== undefined && dto.expectedPay !== null) {
        if (typeof dto.expectedPay !== 'number' || isNaN(dto.expectedPay)) {
          throw new ApplicationValidationError(
            'expectedPay must be a valid number',
          );
        }
        if (dto.expectedPay <= 0) {
          throw new ApplicationValidationError(
            'expectedPay must be greater than 0',
          );
        }
        if (dto.expectedPay > 99999999.99) {
          throw new ApplicationValidationError(
            'expectedPay cannot exceed 99999999.99',
          );
        }
        const parts = dto.expectedPay.toString().split('.');
        if (parts[1] && parts[1].length > 2) {
          throw new ApplicationValidationError(
            'expectedPay cannot have more than 2 decimal places',
          );
        }
        validatedExpectedPay = dto.expectedPay;
      }

      let timezoneOffsetMinutes = 0;
      if (
        dto.timezoneOffsetMinutes !== undefined &&
        dto.timezoneOffsetMinutes !== null
      ) {
        if (!isValidTimezoneOffsetMinutes(dto.timezoneOffsetMinutes)) {
          throw new ApplicationValidationError(
            'timezoneOffsetMinutes must be an integer between -840 and 720',
          );
        }
        timezoneOffsetMinutes = dto.timezoneOffsetMinutes;
      }

      if (dto.availableDate !== undefined && dto.availableDate !== null) {
        if (
          typeof dto.availableDate !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(dto.availableDate)
        ) {
          throw new ApplicationValidationError(
            'availableDate must be in YYYY-MM-DD format',
          );
        }

        const date = parseCalendarDateString(dto.availableDate);
        if (!date) {
          throw new ApplicationValidationError(
            'availableDate is not a valid calendar date',
          );
        }

        const todayForClient = getTodayDateUtcForOffset(timezoneOffsetMinutes);
        if (date < todayForClient) {
          throw new ApplicationValidationError(
            'availableDate cannot be in the past',
          );
        }

        parsedAvailableDate = date;
      }
    }

    // 3. Resolve authenticated User to WorkerProfile
    const workerProfile =
      await this.workerProfileRepository.findByUserId(userId);
    if (!workerProfile) {
      throw new ApplicationNotFoundError(
        'Worker profile not found. Please complete your profile before applying.',
      );
    }

    // 4. Retrieve job post and verify it exists
    const job = await this.jobPostRepository.findById(jobId);
    if (!job) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    // 5. Verify job is OPEN
    if (job.status !== JobStatus.OPEN) {
      throw new ApplicationConflictError(
        'Cannot apply to a job that is not open',
      );
    }

    // 6. Check for existing application from this worker for this job
    const existing = await this.jobApplicationRepository.findByJobAndWorker(
      job.id,
      workerProfile.id,
    );
    if (existing) {
      throw new ApplicationConflictError(
        'You have already applied for this job',
      );
    }

    // 7. Create application with PENDING status and initial audit history entry
    const created = await this.jobApplicationRepository.create({
      jobPostId: job.id,
      workerId: workerProfile.id,
      status: JobApplicationStatus.PENDING,
      expectedPay: validatedExpectedPay,
      availableDate: parsedAvailableDate,
      reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
      changedByUserId: userId,
    });

    // 8. Return response DTO
    return {
      id: created.id,
      jobPostId: created.jobPostId,
      status: created.status,
      expectedPay: created.expectedPay,
      availableDate: created.availableDate,
      appliedAt: created.appliedAt,
      updatedAt: created.updatedAt,
    };
  }
}
