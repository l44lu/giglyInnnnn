import { JobApplicationStatus } from '../../../domain/enums/job-application-status.enum';
import { JobStatus } from '../../../domain/enums/job-status.enum';

export class JobApplicationStatusActionResponseDto {
  applicationId!: string;
  jobPostId!: string;
  status!: JobApplicationStatus;
  jobStatus!: JobStatus;
  updatedAt!: Date;

  constructor(partial?: Partial<JobApplicationStatusActionResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class AcceptJobApplicationResponseDto {
  applicationId!: string;
  jobPostId!: string;
  status!: JobApplicationStatus;
  jobStatus!: JobStatus;
  workersNeeded!: number;
  acceptedCount!: number;
  jobFilled!: boolean;
  autoRejectedCount!: number;
  updatedAt!: Date;

  constructor(partial?: Partial<AcceptJobApplicationResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
