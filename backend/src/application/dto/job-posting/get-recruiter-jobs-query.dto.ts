import { IsEnum, IsOptional } from 'class-validator';

/**
 * Supported status tabs for the recruiter My Postings view.
 * These are presentation filters mapped to one or more domain JobStatus values.
 */
export const RecruiterJobStatusFilter = {
  ALL: 'all',
  ACTIVE: 'active',
  DRAFT: 'draft',
  PAUSED: 'paused',
  CLOSED: 'closed',
} as const;

export type RecruiterJobStatusFilter =
  (typeof RecruiterJobStatusFilter)[keyof typeof RecruiterJobStatusFilter];

export class GetRecruiterJobsQueryDto {
  @IsOptional()
  @IsEnum(RecruiterJobStatusFilter, {
    message: 'Status filter must be one of: all, active, draft, paused, closed',
  })
  status?: RecruiterJobStatusFilter = RecruiterJobStatusFilter.ALL;

  constructor(partial?: Partial<GetRecruiterJobsQueryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (!this.status) {
      this.status = RecruiterJobStatusFilter.ALL;
    }
  }
}
