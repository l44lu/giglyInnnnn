import { JobApplicationStatusHistoryEntity } from '../entities/job-application-status-history.entity';
import { JobApplicationStatus } from '../enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../enums/job-application-reason-code.enum';

export interface CreateJobApplicationStatusHistoryData {
  applicationId: string;
  fromStatus: JobApplicationStatus | null;
  toStatus: JobApplicationStatus;
  reasonCode: JobApplicationReasonCode;
  reasonNote?: string | null;
  changedByUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append-only repository contract for job application status history.
 * Update and delete operations are intentionally omitted to enforce immutability.
 */
export interface IJobApplicationStatusHistoryRepository {
  append(
    data: CreateJobApplicationStatusHistoryData,
  ): Promise<JobApplicationStatusHistoryEntity>;
  findByApplicationId(
    applicationId: string,
  ): Promise<JobApplicationStatusHistoryEntity[]>;
}

export const IJobApplicationStatusHistoryRepository = Symbol(
  'IJobApplicationStatusHistoryRepository',
);
