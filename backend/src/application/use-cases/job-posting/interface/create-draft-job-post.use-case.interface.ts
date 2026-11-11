import { CreateDraftJobPostInputDto } from '../../../dto/job-posting/create-draft-job-post-input.dto';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

export interface ICreateDraftJobPostUseCase {
  execute(
    recruiterId: string,
    dto: CreateDraftJobPostInputDto,
  ): Promise<JobPostResponseDto>;
}

export const ICreateDraftJobPostUseCase = Symbol('ICreateDraftJobPostUseCase');
