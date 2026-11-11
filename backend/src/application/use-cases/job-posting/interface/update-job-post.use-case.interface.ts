import { UpdateJobPostInputDto } from '../../../dto/job-posting/update-job-post-input.dto';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

export interface IUpdateJobPostUseCase {
  execute(
    jobPostId: string,
    recruiterId: string,
    dto: UpdateJobPostInputDto,
  ): Promise<JobPostResponseDto>;
}

export const IUpdateJobPostUseCase = Symbol('IUpdateJobPostUseCase');
