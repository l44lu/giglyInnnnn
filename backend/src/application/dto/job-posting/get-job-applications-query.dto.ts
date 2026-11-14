import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { JobApplicationStatus } from '../../../domain/enums/job-application-status.enum';
import { JobApplicationSortBy } from '../../../domain/repositories/job-application.repository.interface';

const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const trimSortByWithDefault = ({ value }: { value: unknown }): unknown => {
  if (value === undefined) {
    return JobApplicationSortBy.RECENT;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : JobApplicationSortBy.RECENT;
};

export class GetJobApplicationsQueryDto {
  @IsOptional()
  @Transform(trimToUndefined)
  @IsEnum(JobApplicationStatus, {
    message:
      'status must be one of: pending, shortlisted, accepted, rejected, withdrawn',
  })
  status?: JobApplicationStatus;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString({ message: 'search must be a string' })
  search?: string;

  @IsOptional()
  @Transform(trimSortByWithDefault)
  @IsEnum(JobApplicationSortBy, {
    message:
      'sortBy must be one of: recent, oldest, expected_pay_asc, expected_pay_desc, available_date_asc',
  })
  sortBy: JobApplicationSortBy = JobApplicationSortBy.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit must not exceed 50' })
  limit: number = 10;

  constructor(partial?: Partial<GetJobApplicationsQueryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (this.page === undefined) {
      this.page = 1;
    }
    if (this.limit === undefined) {
      this.limit = 10;
    }
    if (this.sortBy === undefined) {
      this.sortBy = JobApplicationSortBy.RECENT;
    }
  }
}
