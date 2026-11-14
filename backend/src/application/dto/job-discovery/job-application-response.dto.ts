import { JobApplicationStatus } from '../../../domain/enums/job-application-status.enum';

export class JobApplicationResponseDto {
  id!: string;
  jobPostId!: string;
  status!: JobApplicationStatus;
  expectedPay!: number | null;
  availableDate!: Date | null;
  appliedAt!: Date;
  updatedAt!: Date;
}
