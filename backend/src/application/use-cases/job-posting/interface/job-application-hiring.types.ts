import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import { JobApplicationStatus } from '../../../../domain/enums/job-application-status.enum';
import { JobStatus } from '../../../../domain/enums/job-status.enum';

export interface ManageJobApplicationCommand {
  userId: string;
  jobPostId: string;
  applicationId: string;
  reasonNote?: string | null;
}

export interface ManageJobApplicationResult {
  applicationId: string;
  jobPostId: string;
  previousStatus: JobApplicationStatus;
  status: JobApplicationStatus;
  reasonCode: JobApplicationReasonCode;
  jobStatus: JobStatus;
  updatedAt: Date;
}

export interface AcceptJobApplicationOutput extends ManageJobApplicationResult {
  workersNeeded: number;
  acceptedCount: number;
  jobFilled: boolean;
  autoRejectedCount: number;
  autoRejectedApplicationIds: string[];
}
