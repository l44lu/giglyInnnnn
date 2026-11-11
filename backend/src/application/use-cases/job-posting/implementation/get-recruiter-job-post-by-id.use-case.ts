import { Injectable, Inject } from '@nestjs/common';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../../errors/application.errors';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import { IGetRecruiterJobPostByIdUseCase } from '../interface/get-recruiter-job-post-by-id.use-case.interface';

@Injectable()
export class GetRecruiterJobPostByIdUseCase implements IGetRecruiterJobPostByIdUseCase {
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

    // 1. Retrieve job post with category and skills hydrated
    const jobPost =
      await this.jobPostRepository.findByIdWithSkills(trimmedJobId);

    // 2. Not found check
    if (!jobPost) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    // 3. Ownership verification
    if (jobPost.recruiterId !== trimmedRecruiterId) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to view this job post',
      );
    }

    // 4. Return mapped response
    return JobPostMapper.toResponseDto(jobPost);
  }
}
