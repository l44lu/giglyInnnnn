import { JobPostResponseDto } from './job-post-response.dto';

export class RecruiterJobPostsSummaryDto {
  total!: number;
  active!: number;
  draft!: number;
  paused!: number;
  closed!: number;
  activeLocal!: number;
  activeRemote!: number;

  constructor(partial?: Partial<RecruiterJobPostsSummaryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class GetRecruiterJobPostsResponseDto {
  summary!: RecruiterJobPostsSummaryDto;
  items!: JobPostResponseDto[];

  constructor(partial?: Partial<GetRecruiterJobPostsResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
