import { JobStatus } from '../enums/job-status.enum';
import { WorkType } from '../enums/work-type.enum';
import { PaymentStructure } from '../enums/payment-structure.enum';
import { JobCategoryEntity } from './job-category.entity';
import { SkillEntity } from './skill.entity';
import { CompanyEntity } from './company.entity';
import { RecruiterProfileEntity } from './recruiter-profile.entity';

export { JobStatus, WorkType, PaymentStructure };

export class JobPostEntity {
  id!: string;
  recruiterId!: string;
  categoryId!: string;
  title!: string;
  description!: string;
  workType!: WorkType;
  workersNeeded: number = 1;
  startDate: Date | null = null;
  estimatedDuration: string | null = null;
  shiftDuration: string | null = null;
  jobLocation: string | null = null;
  jobLocationLat: number | null = null;
  jobLocationLng: number | null = null;
  paymentStructure!: PaymentStructure;
  budgetAmount: number | null = null;
  hourlyRate: number | null = null;
  hourlyRateMin: number | null = null;
  hourlyRateMax: number | null = null;
  status: JobStatus = JobStatus.DRAFT;
  isBoosted: boolean = false;
  boostExpiresAt: Date | null = null;
  adminReviewStatus: string = 'pending';
  adminNotes: string | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  // Domain relationship associations (optional, populated when loaded with relations)
  category?: JobCategoryEntity;
  skills?: SkillEntity[];
  company?: CompanyEntity | null;
  recruiter?: RecruiterProfileEntity | null;

  constructor(partial?: Partial<JobPostEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }

    if (this.workersNeeded === undefined) {
      this.workersNeeded = 1;
    }
    if (this.status === undefined) {
      this.status = JobStatus.DRAFT;
    }
    if (this.isBoosted === undefined) {
      this.isBoosted = false;
    }
    if (this.adminReviewStatus === undefined) {
      this.adminReviewStatus = 'pending';
    }

    if (this.startDate === undefined) this.startDate = null;
    if (this.estimatedDuration === undefined) this.estimatedDuration = null;
    if (this.shiftDuration === undefined) this.shiftDuration = null;
    if (this.jobLocation === undefined) this.jobLocation = null;
    if (this.jobLocationLat === undefined) this.jobLocationLat = null;
    if (this.jobLocationLng === undefined) this.jobLocationLng = null;
    if (this.budgetAmount === undefined) this.budgetAmount = null;
    if (this.hourlyRate === undefined) {
      this.hourlyRate = this.hourlyRateMin ?? this.hourlyRateMax ?? null;
    }
    if (this.hourlyRateMin === undefined || this.hourlyRate !== null) {
      this.hourlyRateMin = this.hourlyRate;
    }
    if (this.hourlyRateMax === undefined || this.hourlyRate !== null) {
      this.hourlyRateMax = this.hourlyRate;
    }
    if (this.boostExpiresAt === undefined) this.boostExpiresAt = null;
    if (this.adminNotes === undefined) this.adminNotes = null;
    if (this.recruiter === undefined) this.recruiter = null;

    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (
      this.workersNeeded === null ||
      this.workersNeeded === undefined ||
      typeof this.workersNeeded !== 'number' ||
      !Number.isInteger(this.workersNeeded) ||
      this.workersNeeded <= 0
    ) {
      throw new Error('workersNeeded must be a positive integer');
    }

    if (this.hourlyRate !== null && this.hourlyRate !== undefined) {
      if (typeof this.hourlyRate !== 'number' || this.hourlyRate <= 0) {
        throw new Error('hourlyRate must be greater than zero');
      }
    }

    if (
      this.status !== undefined &&
      !Object.values(JobStatus).includes(this.status)
    ) {
      throw new Error(`Invalid job status: ${this.status}`);
    }

    if (
      this.workType !== undefined &&
      !Object.values(WorkType).includes(this.workType)
    ) {
      throw new Error(`Invalid work type: ${this.workType}`);
    }

    if (
      this.paymentStructure !== undefined &&
      !Object.values(PaymentStructure).includes(this.paymentStructure)
    ) {
      throw new Error(`Invalid payment structure: ${this.paymentStructure}`);
    }

    if (this.title !== undefined && this.title.trim() === '') {
      throw new Error('Job title cannot be empty');
    }

    if (this.recruiterId !== undefined && this.recruiterId.trim() === '') {
      throw new Error('recruiterId cannot be empty');
    }

    if (this.categoryId !== undefined && this.categoryId.trim() === '') {
      throw new Error('categoryId cannot be empty');
    }

    if (this.description !== undefined && this.description.trim() === '') {
      throw new Error('Job description cannot be empty');
    }
  }

  isDraft(): boolean {
    return this.status === JobStatus.DRAFT;
  }

  isOpen(): boolean {
    return this.status === JobStatus.OPEN;
  }

  isFilled(): boolean {
    return this.status === JobStatus.FILLED;
  }
}
