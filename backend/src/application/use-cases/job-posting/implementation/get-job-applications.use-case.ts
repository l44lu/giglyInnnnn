import { Injectable, Inject } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import {
  IJobApplicationRepository,
  JobApplicationSortBy,
} from '../../../../domain/repositories/job-application.repository.interface';
import { JobApplicationStatus } from '../../../../domain/enums/job-application-status.enum';
import {
  ApplicationAuthorizationError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';
import { GetJobApplicationsQueryDto } from '../../../dto/job-posting/get-job-applications-query.dto';
import { GetJobApplicationsResponseDto } from '../../../dto/job-posting/job-applications-response.dto';
import { RecruiterJobApplicationMapper } from '../../../mappers/recruiter-job-application.mapper';
import { IGetJobApplicationsUseCase } from '../interface/get-job-applications.use-case.interface';

@Injectable()
export class GetJobApplicationsUseCase implements IGetJobApplicationsUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
    @Inject(IJobApplicationRepository)
    private readonly jobApplicationRepository: IJobApplicationRepository,
  ) {}

  async execute(
    userId: string,
    jobPostId: string,
    query?: GetJobApplicationsQueryDto,
  ): Promise<GetJobApplicationsResponseDto> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ApplicationValidationError('User ID is required');
    }

    if (
      !jobPostId ||
      typeof jobPostId !== 'string' ||
      jobPostId.trim() === ''
    ) {
      throw new ApplicationValidationError('Job post ID is required');
    }

    const trimmedUserId = userId.trim();
    const trimmedJobId = jobPostId.trim();

    const { status, search, page, limit, sortBy } =
      this.validateAndNormalizeQuery(query);

    // 1. Resolve authenticated User ID to RecruiterProfile (never trust client-supplied recruiter ID)
    const recruiterProfile =
      await this.recruiterProfileRepository.findByUserId(trimmedUserId);
    if (!recruiterProfile) {
      throw new ApplicationNotFoundError('Recruiter profile not found');
    }

    // 2. Verify job existence and ownership BEFORE querying applicants
    const jobPost = await this.jobPostRepository.findById(trimmedJobId);
    if (!jobPost) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    if (jobPost.recruiterId !== recruiterProfile.id) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to view applications for this job post',
      );
    }

    // 3. Query paginated applicants, job info, and status summary counts
    const result = await this.jobApplicationRepository.findByJobPostId({
      jobPostId: trimmedJobId,
      status,
      search,
      page,
      limit,
      sortBy,
    });

    if (!result) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    return RecruiterJobApplicationMapper.toResponseDto(result);
  }

  private validateAndNormalizeQuery(query?: GetJobApplicationsQueryDto): {
    status?: JobApplicationStatus;
    search?: string;
    page: number;
    limit: number;
    sortBy: JobApplicationSortBy;
  } {
    const status = query?.status;
    if (
      status !== undefined &&
      !Object.values(JobApplicationStatus).includes(status)
    ) {
      throw new ApplicationValidationError(
        `Invalid application status filter: ${String(status)}`,
      );
    }

    const rawPage = query?.page ?? 1;
    if (
      typeof rawPage !== 'number' ||
      !Number.isInteger(rawPage) ||
      rawPage < 1
    ) {
      throw new ApplicationValidationError(
        'page must be an integer greater than or equal to 1',
      );
    }

    const rawLimit = query?.limit ?? 10;
    if (
      typeof rawLimit !== 'number' ||
      !Number.isInteger(rawLimit) ||
      rawLimit < 1 ||
      rawLimit > 50
    ) {
      throw new ApplicationValidationError(
        'limit must be an integer between 1 and 50',
      );
    }

    const sortBy = query?.sortBy ?? JobApplicationSortBy.RECENT;
    if (!Object.values(JobApplicationSortBy).includes(sortBy)) {
      throw new ApplicationValidationError(`Invalid sortBy option: ${sortBy}`);
    }

    const trimmedSearch = query?.search?.trim();
    const search =
      trimmedSearch && trimmedSearch.length > 0 ? trimmedSearch : undefined;

    return {
      status,
      search,
      page: rawPage,
      limit: rawLimit,
      sortBy,
    };
  }
}
