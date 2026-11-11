import { Injectable, Inject } from '@nestjs/common';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';
import { IPublishJobPostUseCase } from '../interface/publish-job-post.use-case.interface';

@Injectable()
export class PublishJobPostUseCase implements IPublishJobPostUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
  ) {}

  async execute(
    jobPostId: string,
    recruiterId: string,
  ): Promise<JobPostResponseDto> {
    if (!jobPostId || jobPostId.trim().length === 0) {
      throw new ApplicationValidationError('Job post ID is required');
    }

    if (!recruiterId || recruiterId.trim().length === 0) {
      throw new ApplicationValidationError('Recruiter profile ID is required');
    }

    const trimmedJobId = jobPostId.trim();
    const trimmedRecruiterId = recruiterId.trim();

    // 1. Retrieve the existing job post
    const jobPost =
      await this.jobPostRepository.findByIdWithSkills(trimmedJobId);
    if (!jobPost) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    // 2. Verify ownership: recruiterId must match authenticated profile ID
    if (jobPost.recruiterId !== trimmedRecruiterId) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to publish this job post',
      );
    }

    // 3. Only DRAFT jobs can be published
    if (!jobPost.isDraft()) {
      throw new ApplicationValidationError(
        `Only draft job posts can be published. Current status: ${jobPost.status}`,
      );
    }

    // 4. Validate publication readiness
    this.validatePublicationReadiness(jobPost);

    // 5. Update status to OPEN (keeping adminReviewStatus as pending)
    const updatedJobPost = await this.jobPostRepository.update(trimmedJobId, {
      status: JobStatus.OPEN,
    });

    // 6. Preserve loaded relations for response mapping
    if (!updatedJobPost.category && jobPost.category) {
      updatedJobPost.category = jobPost.category;
    }
    if (!updatedJobPost.skills && jobPost.skills) {
      updatedJobPost.skills = jobPost.skills;
    }

    return JobPostMapper.toResponseDto(updatedJobPost);
  }

  private validatePublicationReadiness(jobPost: {
    title?: string;
    description?: string;
    categoryId?: string;
    workType?: WorkType;
    jobLocation?: string | null;
    paymentStructure?: PaymentStructure;
    budgetAmount?: number | null;
    hourlyRate?: number | null;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
    workersNeeded?: number;
  }): void {
    if (!jobPost.title || jobPost.title.trim().length === 0) {
      throw new ApplicationValidationError('Job title cannot be empty');
    }

    if (!jobPost.description || jobPost.description.trim().length === 0) {
      throw new ApplicationValidationError('Job description cannot be empty');
    }

    if (!jobPost.categoryId || jobPost.categoryId.trim().length === 0) {
      throw new ApplicationValidationError('Category ID is required');
    }

    if (
      !jobPost.workType ||
      !Object.values(WorkType).includes(jobPost.workType)
    ) {
      throw new ApplicationValidationError('Valid work type is required');
    }

    if (
      jobPost.workType === WorkType.LOCAL &&
      (!jobPost.jobLocation || jobPost.jobLocation.trim().length === 0)
    ) {
      throw new ApplicationValidationError(
        'Job location is required for on-site/local jobs',
      );
    }

    if (
      !jobPost.paymentStructure ||
      !Object.values(PaymentStructure).includes(jobPost.paymentStructure)
    ) {
      throw new ApplicationValidationError(
        'Valid payment structure is required',
      );
    }

    if (jobPost.paymentStructure === PaymentStructure.FIXED) {
      if (
        jobPost.budgetAmount === null ||
        jobPost.budgetAmount === undefined ||
        typeof jobPost.budgetAmount !== 'number' ||
        jobPost.budgetAmount <= 0
      ) {
        throw new ApplicationValidationError(
          'Budget amount must be a positive number for fixed price jobs',
        );
      }
      if (
        (jobPost.hourlyRate !== null && jobPost.hourlyRate !== undefined) ||
        (jobPost.hourlyRateMin !== null &&
          jobPost.hourlyRateMin !== undefined) ||
        (jobPost.hourlyRateMax !== null && jobPost.hourlyRateMax !== undefined)
      ) {
        throw new ApplicationValidationError(
          'Hourly rate is not allowed for fixed price jobs',
        );
      }
    }

    if (jobPost.paymentStructure === PaymentStructure.HOURLY) {
      const rate =
        jobPost.hourlyRate ?? jobPost.hourlyRateMin ?? jobPost.hourlyRateMax;
      if (
        rate === null ||
        rate === undefined ||
        typeof rate !== 'number' ||
        rate <= 0
      ) {
        throw new ApplicationValidationError(
          'Hourly rate must be a positive number for hourly jobs',
        );
      }
      if (jobPost.budgetAmount !== null && jobPost.budgetAmount !== undefined) {
        throw new ApplicationValidationError(
          'Budget amount is not allowed for hourly jobs',
        );
      }
    }

    if (
      jobPost.workersNeeded === null ||
      jobPost.workersNeeded === undefined ||
      typeof jobPost.workersNeeded !== 'number' ||
      !Number.isInteger(jobPost.workersNeeded) ||
      jobPost.workersNeeded <= 0
    ) {
      throw new ApplicationValidationError(
        'workersNeeded must be a positive integer',
      );
    }
  }
}
