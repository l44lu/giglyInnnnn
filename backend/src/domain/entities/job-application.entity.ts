import { JobApplicationStatus } from '../enums/job-application-status.enum';

export { JobApplicationStatus };

export class InvalidJobApplicationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJobApplicationTransitionError';
    Object.setPrototypeOf(this, InvalidJobApplicationTransitionError.prototype);
  }
}

const ALLOWED_JOB_APPLICATION_TRANSITIONS: Record<
  JobApplicationStatus,
  readonly JobApplicationStatus[]
> = {
  [JobApplicationStatus.PENDING]: [
    JobApplicationStatus.SHORTLISTED,
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
    JobApplicationStatus.WITHDRAWN,
  ],
  [JobApplicationStatus.SHORTLISTED]: [
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
    JobApplicationStatus.WITHDRAWN,
  ],
  [JobApplicationStatus.ACCEPTED]: [],
  [JobApplicationStatus.REJECTED]: [],
  [JobApplicationStatus.WITHDRAWN]: [],
};

export class JobApplicationEntity {
  id!: string;
  jobPostId!: string;
  workerId!: string;
  private _status: JobApplicationStatus = JobApplicationStatus.PENDING;
  expectedPay: number | null = null;
  availableDate: Date | null = null;
  appliedAt!: Date;
  updatedAt!: Date;

  constructor(partial?: Partial<JobApplicationEntity>) {
    if (partial) {
      const { status, ...rest } = partial;
      Object.assign(this, rest);
      if (status !== undefined) {
        this._status = status;
      }
    }

    if (this.expectedPay === undefined) {
      this.expectedPay = null;
    }
    if (this.availableDate === undefined) {
      this.availableDate = null;
    }

    this.validateInvariants();
  }

  get status(): JobApplicationStatus {
    return this._status;
  }

  static getAllowedTransitions(
    fromStatus: JobApplicationStatus,
  ): readonly JobApplicationStatus[] {
    return ALLOWED_JOB_APPLICATION_TRANSITIONS[fromStatus] ?? [];
  }

  canTransitionTo(targetStatus: JobApplicationStatus): boolean {
    const allowed = ALLOWED_JOB_APPLICATION_TRANSITIONS[this._status];
    if (!allowed) {
      return false;
    }
    return allowed.includes(targetStatus);
  }

  isTerminal(): boolean {
    return ALLOWED_JOB_APPLICATION_TRANSITIONS[this._status].length === 0;
  }

  shortlist(): void {
    this.transitionTo(JobApplicationStatus.SHORTLISTED);
  }

  accept(): void {
    this.transitionTo(JobApplicationStatus.ACCEPTED);
  }

  reject(): void {
    this.transitionTo(JobApplicationStatus.REJECTED);
  }

  withdraw(): void {
    this.transitionTo(JobApplicationStatus.WITHDRAWN);
  }

  private transitionTo(targetStatus: JobApplicationStatus): void {
    const validStatuses = Object.values(JobApplicationStatus);
    if (!validStatuses.includes(targetStatus)) {
      throw new InvalidJobApplicationTransitionError(
        `Invalid target application status: ${String(targetStatus)}`,
      );
    }

    if (!this.canTransitionTo(targetStatus)) {
      throw new InvalidJobApplicationTransitionError(
        `Cannot transition job application from "${this._status}" to "${targetStatus}"`,
      );
    }

    this._status = targetStatus;
  }

  private validateInvariants(): void {
    if (
      !this.jobPostId ||
      typeof this.jobPostId !== 'string' ||
      this.jobPostId.trim() === ''
    ) {
      throw new Error('jobPostId must be a non-empty string');
    }

    if (
      !this.workerId ||
      typeof this.workerId !== 'string' ||
      this.workerId.trim() === ''
    ) {
      throw new Error('workerId must be a non-empty string');
    }

    const validStatuses = Object.values(JobApplicationStatus);
    if (!validStatuses.includes(this._status)) {
      throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
    }

    if (this.expectedPay !== null && this.expectedPay !== undefined) {
      if (typeof this.expectedPay !== 'number' || isNaN(this.expectedPay)) {
        throw new Error('expectedPay must be a valid number');
      }
      if (this.expectedPay <= 0) {
        throw new Error('expectedPay must be greater than 0');
      }
      if (this.expectedPay > 99999999.99) {
        throw new Error('expectedPay cannot exceed 99999999.99');
      }
      const parts = this.expectedPay.toString().split('.');
      if (parts[1] && parts[1].length > 2) {
        throw new Error('expectedPay cannot have more than 2 decimal places');
      }
    }

    if (this.availableDate !== null && this.availableDate !== undefined) {
      if (
        !(this.availableDate instanceof Date) ||
        isNaN(this.availableDate.getTime())
      ) {
        throw new Error('availableDate must be a valid Date');
      }
    }
  }
}
