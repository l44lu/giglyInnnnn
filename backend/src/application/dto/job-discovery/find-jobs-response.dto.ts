import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { JobStatus } from '../../../domain/enums/job-status.enum';
import { JobCategoryResponseDto } from '../job-posting/job-category-response.dto';
import { SkillResponseDto } from '../worker-profile/skill-response.dto';

export class JobDiscoveryCompanyDto {
  id!: string | null;
  name!: string;
  logoUrl!: string | null;

  constructor(partial?: Partial<JobDiscoveryCompanyDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class JobDiscoveryItemDto {
  id!: string;
  categoryId!: string;
  title!: string;
  description!: string;
  workType!: WorkType;
  workersNeeded!: number;
  startDate!: Date | null;
  estimatedDuration!: string | null;
  shiftDuration!: string | null;
  jobLocation!: string | null;
  jobLocationLat!: number | null;
  jobLocationLng!: number | null;
  paymentStructure!: PaymentStructure;
  budgetAmount!: number | null;
  hourlyRate!: number | null;
  status!: JobStatus;
  createdAt!: Date;

  category?: JobCategoryResponseDto;
  skills?: SkillResponseDto[];
  company?: JobDiscoveryCompanyDto | null;

  constructor(partial?: Partial<JobDiscoveryItemDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class PaginationMetadataDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  constructor(partial?: Partial<PaginationMetadataDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class FindJobsResponseDto {
  items!: JobDiscoveryItemDto[];
  pagination!: PaginationMetadataDto;

  constructor(partial?: Partial<FindJobsResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
