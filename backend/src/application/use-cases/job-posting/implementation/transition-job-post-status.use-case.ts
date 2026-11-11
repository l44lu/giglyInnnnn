import { Injectable, Inject } from '@nestjs/common';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';
import {
  ITransitionJobPostStatusUseCase,
  JobPostStatusAction,
} from '../interface/transition-job-post-status.use-case.interface';

@Injectable()
export class TransitionJobPostStatusUseCase implements ITransitionJobPostStatusUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
  ) {}

  async execute(
    jobPostId: string,
    recruiterId: string,
    action: JobPostStatusAction,
  ): Promise<JobPostResponseDto> {
    if (!jobPostId || jobPostId.trim().length === 0) {
      throw new ApplicationValidationError('Job post ID is required');
    }

    if (!recruiterId || recruiterId.trim().length === 0) {
      throw new ApplicationValidationError('Recruiter profile ID is required');
    }

    if (!Object.values(JobPostStatusAction).includes(action)) {
      throw new ApplicationValidationError(
        `Invalid status transition action: ${action}`,
      );
    }

    const trimmedJobId = jobPostId.trim();
    const trimmedRecruiterId = recruiterId.trim();

    // 1. Retrieve the existing job post with category & skills
    const jobPost =
      await this.jobPostRepository.findByIdWithSkills(trimmedJobId);
    if (!jobPost) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    // 2. Verify ownership: recruiterId must match authenticated profile ID
    if (jobPost.recruiterId !== trimmedRecruiterId) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to modify this job post',
      );
    }

    // 3. Determine target status based on current status and action
    const targetStatus = this.resolveTargetStatus(jobPost.status, action);

    // 4. Update the job status
    const updatedJobPost = await this.jobPostRepository.update(trimmedJobId, {
      status: targetStatus,
    });

    // 5. Preserve relations for response mapping
    if (!updatedJobPost.category && jobPost.category) {
      updatedJobPost.category = jobPost.category;
    }
    if (!updatedJobPost.skills && jobPost.skills) {
      updatedJobPost.skills = jobPost.skills;
    }

    return JobPostMapper.toResponseDto(updatedJobPost);
  }

  private resolveTargetStatus(
    currentStatus: JobStatus,
    action: JobPostStatusAction,
  ): JobStatus {
    switch (action) {
      case JobPostStatusAction.PAUSE:
        if (currentStatus === JobStatus.OPEN) {
          return JobStatus.PAUSED;
        }
        if (currentStatus === JobStatus.PAUSED) {
          throw new ApplicationValidationError('Job post is already paused');
        }
        if (currentStatus === JobStatus.DRAFT) {
          throw new ApplicationValidationError(
            'Draft job posts cannot be paused',
          );
        }
        throw new ApplicationValidationError(
          `Cannot pause job post with status: ${currentStatus}`,
        );

      case JobPostStatusAction.REOPEN:
        if (currentStatus === JobStatus.PAUSED) {
          return JobStatus.OPEN;
        }
        if (currentStatus === JobStatus.OPEN) {
          throw new ApplicationValidationError('Job post is already open');
        }
        if (currentStatus === JobStatus.DRAFT) {
          throw new ApplicationValidationError(
            'Draft job posts cannot be reopened',
          );
        }
        throw new ApplicationValidationError(
          `Cannot reopen job post with status: ${currentStatus}`,
        );

      case JobPostStatusAction.CLOSE:
        if (
          currentStatus === JobStatus.OPEN ||
          currentStatus === JobStatus.PAUSED
        ) {
          return JobStatus.CANCELLED;
        }
        if (currentStatus === JobStatus.CANCELLED) {
          throw new ApplicationValidationError('Job post is already closed');
        }
        if (currentStatus === JobStatus.DRAFT) {
          throw new ApplicationValidationError(
            'Draft job posts cannot be closed',
          );
        }
        throw new ApplicationValidationError(
          `Cannot close job post with status: ${currentStatus}`,
        );

      default:
        throw new ApplicationValidationError(
          `Unsupported action: ${String(action)}`,
        );
    }
  }
}
