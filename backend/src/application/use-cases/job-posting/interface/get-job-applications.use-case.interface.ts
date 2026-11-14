import { GetJobApplicationsQueryDto } from '../../../dto/job-posting/get-job-applications-query.dto';
import { GetJobApplicationsResponseDto } from '../../../dto/job-posting/job-applications-response.dto';

export interface IGetJobApplicationsUseCase {
  execute(
    userId: string,
    jobPostId: string,
    query?: GetJobApplicationsQueryDto,
  ): Promise<GetJobApplicationsResponseDto>;
}

export const IGetJobApplicationsUseCase = Symbol('IGetJobApplicationsUseCase');
