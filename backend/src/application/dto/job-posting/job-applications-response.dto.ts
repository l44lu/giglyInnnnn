import { JobApplicationReasonCode } from '../../../domain/enums/job-application-reason-code.enum';
import { JobApplicationStatus } from '../../../domain/enums/job-application-status.enum';
import { JobStatus } from '../../../domain/enums/job-status.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaginationMetadataDto } from '../job-discovery/find-jobs-response.dto';

export class JobApplicationJobInfoDto {
  id!: string;
  title!: string;
  status!: JobStatus;
  workersNeeded!: number;
  workType!: WorkType;
  paymentStructure!: PaymentStructure;
  budgetAmount!: number | null;
  hourlyRate!: number | null;
  acceptedCount!: number;

  constructor(partial?: Partial<JobApplicationJobInfoDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class JobApplicationsSummaryDto {
  total!: number;
  pending!: number;
  shortlisted!: number;
  accepted!: number;
  rejected!: number;
  withdrawn!: number;

  constructor(partial?: Partial<JobApplicationsSummaryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class ApplicantSkillDto {
  id!: string;
  name!: string;
  skillType!: string;

  constructor(partial?: Partial<ApplicantSkillDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class ApplicantWorkerDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  location!: string | null;
  bio!: string | null;
  headline!: string | null;
  yearsExperience!: number | null;
  responseTimeHours!: number | null;
  availabilityStatus!: string;
  isOpenToWork!: boolean;
  totalCompletedGigs!: number;
  hasAvatar!: boolean;
  skills!: ApplicantSkillDto[];

  constructor(partial?: Partial<ApplicantWorkerDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class ApplicationHistorySummaryDto {
  lastChangedAt!: Date;
  latestReasonCode!: JobApplicationReasonCode;
  transitionCount!: number;

  constructor(partial?: Partial<ApplicationHistorySummaryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class RecruiterJobApplicationItemDto {
  id!: string;
  jobPostId!: string;
  status!: JobApplicationStatus;
  expectedPay!: number | null;
  availableDate!: Date | null;
  appliedAt!: Date;
  updatedAt!: Date;
  worker!: ApplicantWorkerDto;
  historySummary!: ApplicationHistorySummaryDto | null;

  constructor(partial?: Partial<RecruiterJobApplicationItemDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class GetJobApplicationsResponseDto {
  job!: JobApplicationJobInfoDto;
  summary!: JobApplicationsSummaryDto;
  items!: RecruiterJobApplicationItemDto[];
  pagination!: PaginationMetadataDto;

  constructor(partial?: Partial<GetJobApplicationsResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
