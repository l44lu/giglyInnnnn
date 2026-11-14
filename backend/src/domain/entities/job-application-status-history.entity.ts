import { JobApplicationStatus } from '../enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../enums/job-application-reason-code.enum';

/**
 * Append-only audit log entry capturing a JobApplication status transition.
 */
export class JobApplicationStatusHistoryEntity {
  readonly id!: string;
  readonly applicationId!: string;
  readonly fromStatus: JobApplicationStatus | null = null;
  readonly toStatus!: JobApplicationStatus;
  readonly reasonCode!: JobApplicationReasonCode;
  readonly reasonNote: string | null = null;
  readonly changedByUserId: string | null = null;
  readonly metadata: Record<string, unknown> | null = null;
  readonly createdAt!: Date;

  constructor(partial: Partial<JobApplicationStatusHistoryEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }

    if (this.fromStatus === undefined) {
      this.fromStatus = null;
    }
    if (this.reasonNote === undefined) {
      this.reasonNote = null;
    }
    if (this.changedByUserId === undefined) {
      this.changedByUserId = null;
    }
    if (this.metadata === undefined) {
      this.metadata = null;
    }

    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (
      !this.applicationId ||
      typeof this.applicationId !== 'string' ||
      this.applicationId.trim() === ''
    ) {
      throw new Error('applicationId must be a non-empty string');
    }

    const validStatuses = Object.values(JobApplicationStatus);

    if (this.fromStatus !== null && !validStatuses.includes(this.fromStatus)) {
      throw new Error(`fromStatus must be one of: ${validStatuses.join(', ')}`);
    }

    if (!validStatuses.includes(this.toStatus)) {
      throw new Error(`toStatus must be one of: ${validStatuses.join(', ')}`);
    }

    if (
      !this.reasonCode ||
      typeof this.reasonCode !== 'string' ||
      this.reasonCode.trim() === ''
    ) {
      throw new Error('reasonCode must be a non-empty string');
    }

    if (
      this.reasonNote !== null &&
      this.reasonNote !== undefined &&
      typeof this.reasonNote !== 'string'
    ) {
      throw new Error('reasonNote must be a string or null');
    }

    if (
      this.changedByUserId !== null &&
      this.changedByUserId !== undefined &&
      (typeof this.changedByUserId !== 'string' ||
        this.changedByUserId.trim() === '')
    ) {
      throw new Error('changedByUserId must be a non-empty string or null');
    }

    if (this.metadata !== null && this.metadata !== undefined) {
      if (typeof this.metadata !== 'object' || Array.isArray(this.metadata)) {
        throw new Error('metadata must be a JSON object or null');
      }
    }
  }
}
