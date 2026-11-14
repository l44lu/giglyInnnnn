import { JobApplicationEntity } from '../entities/job-application.entity';
import { JobApplicationStatus } from '../enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../enums/job-application-reason-code.enum';
import { JobStatus } from '../enums/job-status.enum';
import { WorkType } from '../enums/work-type.enum';
import { PaymentStructure } from '../enums/payment-structure.enum';
import { IBaseRepository } from './base.repository.interface';

export enum JobApplicationSortBy {
  RECENT = 'recent',
  OLDEST = 'oldest',
  EXPECTED_PAY_ASC = 'expected_pay_asc',
  EXPECTED_PAY_DESC = 'expected_pay_desc',
  AVAILABLE_DATE_ASC = 'available_date_asc',
}

export interface FindJobApplicationsParams {
  jobPostId: string;
  status?: JobApplicationStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: JobApplicationSortBy;
}

export interface JobApplicationApplicantSkillReadModel {
  id: string;
  name: string;
  skillType: string;
}

export interface JobApplicationApplicantWorkerReadModel {
  id: string;
  firstName: string;
  lastName: string;
  location: string | null;
  bio: string | null;
  headline: string | null;
  yearsExperience: number | null;
  responseTimeHours: number | null;
  availabilityStatus: string;
  isOpenToWork: boolean;
  totalCompletedGigs: number;
  hasAvatar: boolean;
  skills: JobApplicationApplicantSkillReadModel[];
}

export interface JobApplicationHistorySummaryReadModel {
  lastChangedAt: Date;
  latestReasonCode: JobApplicationReasonCode;
  transitionCount: number;
}

export interface JobApplicationReadModel {
  id: string;
  jobPostId: string;
  status: JobApplicationStatus;
  expectedPay: number | null;
  availableDate: Date | null;
  appliedAt: Date;
  updatedAt: Date;
  worker: JobApplicationApplicantWorkerReadModel;
  historySummary: JobApplicationHistorySummaryReadModel | null;
}

export interface JobApplicationStatusCounts {
  total: number;
  pending: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
}

export interface JobApplicationJobInfoReadModel {
  id: string;
  title: string;
  status: JobStatus;
  workersNeeded: number;
  workType: WorkType;
  paymentStructure: PaymentStructure;
  budgetAmount: number | null;
  hourlyRate: number | null;
  acceptedCount: number;
}

export interface FindJobApplicationsResult {
  job: JobApplicationJobInfoReadModel;
  items: JobApplicationReadModel[];
  total: number;
  page: number;
  limit: number;
  summary: JobApplicationStatusCounts;
}

export interface CreateJobApplicationData {
  jobPostId: string;
  workerId: string;
  status?: JobApplicationStatus;
  expectedPay?: number | null;
  availableDate?: Date | null;
  reasonCode?: JobApplicationReasonCode;
  reasonNote?: string | null;
  changedByUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TransitionJobApplicationParams {
  jobPostId: string;
  applicationId: string;
  recruiterId?: string;
  changedByUserId: string;
  reasonNote?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TransitionJobApplicationResult {
  application: JobApplicationEntity;
  previousStatus: JobApplicationStatus;
  jobStatus: JobStatus;
}

export interface AcceptJobApplicationResult {
  application: JobApplicationEntity;
  previousStatus: JobApplicationStatus;
  jobStatus: JobStatus;
  workersNeeded: number;
  acceptedCount: number;
  jobFilled: boolean;
  autoRejectedCount: number;
  autoRejectedApplicationIds: string[];
}

export interface IJobApplicationRepository extends Omit<
  IBaseRepository<JobApplicationEntity>,
  'create'
> {
  create(data: CreateJobApplicationData): Promise<JobApplicationEntity>;
  findByJobAndWorker(
    jobPostId: string,
    workerId: string,
  ): Promise<JobApplicationEntity | null>;
  findByJobPostId(
    params: FindJobApplicationsParams,
  ): Promise<FindJobApplicationsResult | null>;
  shortlistApplication(
    params: TransitionJobApplicationParams,
  ): Promise<TransitionJobApplicationResult>;
  rejectApplication(
    params: TransitionJobApplicationParams,
  ): Promise<TransitionJobApplicationResult>;
  acceptApplication(
    params: TransitionJobApplicationParams,
  ): Promise<AcceptJobApplicationResult>;
}

export const IJobApplicationRepository = Symbol('IJobApplicationRepository');
