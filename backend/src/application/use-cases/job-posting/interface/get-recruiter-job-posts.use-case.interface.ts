import { GetRecruiterJobsQueryDto } from '../../../dto/job-posting/get-recruiter-jobs-query.dto';
import { GetRecruiterJobPostsResponseDto } from '../../../dto/job-posting/recruiter-job-posts-response.dto';

export interface IGetRecruiterJobPostsUseCase {
  execute(
    recruiterId: string,
    query?: GetRecruiterJobsQueryDto,
  ): Promise<GetRecruiterJobPostsResponseDto>;
}

export const IGetRecruiterJobPostsUseCase = Symbol(
  'IGetRecruiterJobPostsUseCase',
);
