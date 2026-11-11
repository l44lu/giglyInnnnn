import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

export interface IPublishJobPostUseCase {
  execute(jobPostId: string, recruiterId: string): Promise<JobPostResponseDto>;
}

export const IPublishJobPostUseCase = Symbol('IPublishJobPostUseCase');
