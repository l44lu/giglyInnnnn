import { ReportStatus } from '../enums/report-status.enum';

export { ReportStatus };

export class ReportEntity {
  id!: string;
  displayId!: string;
  reporterId!: string;
  reportedUserId!: string;
  jobPostId: string | null = null;
  reportType!: string;
  description!: string;
  evidenceFileUrl: string | null = null;
  status: ReportStatus = ReportStatus.PENDING;
  adminNotes: string | null = null;
  resolvedBy: string | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial?: Partial<ReportEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }

    if (this.status === undefined) {
      this.status = ReportStatus.PENDING;
    }
    if (this.jobPostId === undefined) {
      this.jobPostId = null;
    }
    if (this.evidenceFileUrl === undefined) {
      this.evidenceFileUrl = null;
    }
    if (this.adminNotes === undefined) {
      this.adminNotes = null;
    }
    if (this.resolvedBy === undefined) {
      this.resolvedBy = null;
    }

    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (
      !this.reporterId ||
      typeof this.reporterId !== 'string' ||
      this.reporterId.trim() === ''
    ) {
      throw new Error('reporterId must be a non-empty string');
    }

    if (
      !this.reportedUserId ||
      typeof this.reportedUserId !== 'string' ||
      this.reportedUserId.trim() === ''
    ) {
      throw new Error('reportedUserId must be a non-empty string');
    }

    if (
      !this.reportType ||
      typeof this.reportType !== 'string' ||
      this.reportType.trim() === ''
    ) {
      throw new Error('reportType must be a non-empty string');
    }

    if (
      !this.description ||
      typeof this.description !== 'string' ||
      this.description.trim() === ''
    ) {
      throw new Error('description must be a non-empty string');
    }

    if (this.description.trim().length > 500) {
      throw new Error('description cannot exceed 500 characters');
    }

    const validStatuses = Object.values(ReportStatus);
    if (!validStatuses.includes(this.status)) {
      throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
    }
  }
}
