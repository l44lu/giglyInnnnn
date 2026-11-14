import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { JobStatus } from '../../../domain/enums/job-status.enum';
import { JobCategoryResponseDto } from '../job-posting/job-category-response.dto';
import { SkillResponseDto } from '../worker-profile/skill-response.dto';

export class WorkerJobDetailsCompanyDto {
  id!: string | null;
  name!: string;
  logoUrl!: string | null;
  about!: string | null;
  industry!: string | null;
  website!: string | null;
  headquartersLocation!: string | null;

  constructor(partial?: Partial<WorkerJobDetailsCompanyDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class WorkerJobDetailsRecruiterDto {
  name!: string;
  roleTitle!: string | null;
  avatarUrl!: string | null;
  location!: string | null;
  bio!: string | null;
  yearsExperience!: number | null;

  constructor(partial?: Partial<WorkerJobDetailsRecruiterDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class WorkerJobDetailsResponseDto {
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
  updatedAt!: Date;

  category?: JobCategoryResponseDto;
  skills?: SkillResponseDto[];
  company?: WorkerJobDetailsCompanyDto | null;
  recruiter?: WorkerJobDetailsRecruiterDto | null;

  constructor(partial?: Partial<WorkerJobDetailsResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
