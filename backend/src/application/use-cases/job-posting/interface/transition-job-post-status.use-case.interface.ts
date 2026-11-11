import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';

export enum JobPostStatusAction {
  PAUSE = 'pause',
  REOPEN = 'reopen',
  CLOSE = 'close',
}

export interface ITransitionJobPostStatusUseCase {
  execute(
    jobPostId: string,
    recruiterId: string,
    action: JobPostStatusAction,
  ): Promise<JobPostResponseDto>;
}

export const ITransitionJobPostStatusUseCase = Symbol(
  'ITransitionJobPostStatusUseCase',
);
