import { Injectable, Inject } from '@nestjs/common';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { ApplicationValidationError } from '../../../errors/application.errors';
import {
  GetRecruiterJobsQueryDto,
  RecruiterJobStatusFilter,
} from '../../../dto/job-posting/get-recruiter-jobs-query.dto';
import {
  GetRecruiterJobPostsResponseDto,
  RecruiterJobPostsSummaryDto,
} from '../../../dto/job-posting/recruiter-job-posts-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import { IGetRecruiterJobPostsUseCase } from '../interface/get-recruiter-job-posts.use-case.interface';

@Injectable()
export class GetRecruiterJobPostsUseCase implements IGetRecruiterJobPostsUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
  ) {}

  async execute(
    recruiterId: string,
    query?: GetRecruiterJobsQueryDto,
  ): Promise<GetRecruiterJobPostsResponseDto> {
    if (!recruiterId || recruiterId.trim() === '') {
      throw new ApplicationValidationError('Recruiter profile ID is required');
    }

    const trimmedRecruiterId = recruiterId.trim();

    // 1. Resolve and validate the requested status tab filter
    const statusFilter = query?.status ?? RecruiterJobStatusFilter.ALL;
    const validFilters = Object.values(RecruiterJobStatusFilter);

    if (!validFilters.includes(statusFilter)) {
      throw new ApplicationValidationError(
        `Invalid status filter: ${statusFilter}`,
      );
    }

    // 2. Retrieve all job posts owned by this recruiter profile
    const allJobs =
      (await this.jobPostRepository.findByRecruiterId(trimmedRecruiterId)) ??
      [];

    // 3. Compute summary counts across ALL of the recruiter's posts (independent of selected tab)
    let active = 0;
    let draft = 0;
    let paused = 0;
    let closed = 0;
    let activeLocal = 0;
    let activeRemote = 0;

    for (const job of allJobs) {
      switch (job.status) {
        case JobStatus.OPEN:
          active++;
          if (job.workType === WorkType.LOCAL) {
            activeLocal++;
          } else if (job.workType === WorkType.REMOTE) {
            activeRemote++;
          }
          break;
        case JobStatus.DRAFT:
          draft++;
          break;
        case JobStatus.PAUSED:
          paused++;
          break;
        case JobStatus.FILLED:
        case JobStatus.COMPLETED:
        case JobStatus.CANCELLED:
          closed++;
          break;
        default:
          break;
      }
    }

    const summary = new RecruiterJobPostsSummaryDto({
      total: allJobs.length,
      active,
      draft,
      paused,
      closed,
      activeLocal,
      activeRemote,
    });

    // 4. Apply the requested status filter only to the returned items
    let filteredJobs = allJobs;
    switch (statusFilter) {
      case RecruiterJobStatusFilter.ACTIVE:
        filteredJobs = allJobs.filter((job) => job.status === JobStatus.OPEN);
        break;
      case RecruiterJobStatusFilter.DRAFT:
        filteredJobs = allJobs.filter((job) => job.status === JobStatus.DRAFT);
        break;
      case RecruiterJobStatusFilter.PAUSED:
        filteredJobs = allJobs.filter((job) => job.status === JobStatus.PAUSED);
        break;
      case RecruiterJobStatusFilter.CLOSED:
        filteredJobs = allJobs.filter(
          (job) =>
            job.status === JobStatus.FILLED ||
            job.status === JobStatus.COMPLETED ||
            job.status === JobStatus.CANCELLED,
        );
        break;
      case RecruiterJobStatusFilter.ALL:
      default:
        filteredJobs = allJobs;
        break;
    }

    // 5. Map returned entities to DTOs while preserving createdAt descending order
    const items = filteredJobs.map((job) => JobPostMapper.toResponseDto(job));

    return new GetRecruiterJobPostsResponseDto({
      summary,
      items,
    });
  }
}
