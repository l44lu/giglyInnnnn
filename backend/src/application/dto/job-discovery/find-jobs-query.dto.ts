import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { JobSortBy } from '../../../domain/repositories/job-post.repository.interface';

export class FindJobsQueryDto {
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsEnum(WorkType, {
    message: 'workType must be one of: local, remote',
  })
  workType?: WorkType;

  @IsOptional()
  @IsString({ message: 'location must be a string' })
  location?: string;

  @IsOptional()
  @IsEnum(PaymentStructure, {
    message: 'paymentStructure must be one of: fixed, hourly',
  })
  paymentStructure?: PaymentStructure;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPay must be a number' })
  @Min(0, { message: 'minPay must be non-negative' })
  minPay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPay must be a number' })
  @Min(0, { message: 'maxPay must be non-negative' })
  maxPay?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) {
      return value
        .flatMap((v: unknown) => (typeof v === 'string' ? v.split(',') : [v]))
        .map((s: unknown) => (typeof s === 'string' ? s.trim() : s))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray({ message: 'skillIds must be an array or comma-separated list' })
  @IsUUID('4', { each: true, message: 'Each skillId must be a valid UUID' })
  skillIds?: string[];

  @IsOptional()
  @IsEnum(JobSortBy, {
    message: 'sortBy must be one of: recent, pay_high, pay_low',
  })
  sortBy: JobSortBy = JobSortBy.RECENT;

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

  constructor(partial?: Partial<FindJobsQueryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (this.page === undefined) this.page = 1;
    if (this.limit === undefined) this.limit = 10;
    if (this.sortBy === undefined) this.sortBy = JobSortBy.RECENT;
  }
}
