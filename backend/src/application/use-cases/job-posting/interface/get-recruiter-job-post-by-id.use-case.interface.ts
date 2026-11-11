import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

export interface IGetRecruiterJobPostByIdUseCase {
  execute(jobPostId: string, recruiterId: string): Promise<JobPostResponseDto>;
}

export const IGetRecruiterJobPostByIdUseCase = Symbol(
  'IGetRecruiterJobPostByIdUseCase',
);
