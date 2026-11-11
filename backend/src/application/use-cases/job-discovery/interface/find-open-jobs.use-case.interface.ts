import { FindJobsQueryDto } from '../../../dto/job-discovery/find-jobs-query.dto';
import { FindJobsResponseDto } from '../../../dto/job-discovery/find-jobs-response.dto';

export interface IFindOpenJobsUseCase {
  execute(query: FindJobsQueryDto): Promise<FindJobsResponseDto>;
}

export const IFindOpenJobsUseCase = Symbol('IFindOpenJobsUseCase');
