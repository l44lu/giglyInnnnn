import { JobStatus } from '../../../domain/enums/job-status.enum';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { JobCategoryResponseDto } from './job-category-response.dto';
import { SkillResponseDto } from '../worker-profile/skill-response.dto';

export class JobPostResponseDto {
  id!: string;
  recruiterId!: string;
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
  hourlyRateMin!: number | null;
  hourlyRateMax!: number | null;
  status!: JobStatus;
  isBoosted!: boolean;
  boostExpiresAt!: Date | null;
  adminReviewStatus!: string;
  adminNotes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  category?: JobCategoryResponseDto;
  skills?: SkillResponseDto[];

  constructor(partial: Partial<JobPostResponseDto>) {
    Object.assign(this, partial);
  }
}
