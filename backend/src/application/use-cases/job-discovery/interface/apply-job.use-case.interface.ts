import { ApplyJobInputDto } from '../../../dto/job-discovery/apply-job-input.dto';
import { JobApplicationResponseDto } from '../../../dto/job-discovery/job-application-response.dto';

export interface IApplyJobUseCase {
  execute(
    userId: string,
    jobId: string,
    dto?: ApplyJobInputDto,
  ): Promise<JobApplicationResponseDto>;
}

export const IApplyJobUseCase = Symbol('IApplyJobUseCase');
