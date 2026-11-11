import { JobPostEntity } from '../entities/job-post.entity';
import { JobStatus } from '../enums/job-status.enum';
import { WorkType } from '../enums/work-type.enum';
import { PaymentStructure } from '../enums/payment-structure.enum';
import { IBaseRepository } from './base.repository.interface';

export enum JobSortBy {
  RECENT = 'recent',
  PAY_HIGH = 'pay_high',
  PAY_LOW = 'pay_low',
}

export interface FindOpenJobsParams {
  search?: string;
  categoryId?: string;
  workType?: WorkType;
  location?: string;
  paymentStructure?: PaymentStructure;
  minPay?: number;
  maxPay?: number;
  skillIds?: string[];
  sortBy?: JobSortBy;
  page: number;
  limit: number;
}

export interface FindOpenJobsResult {
  items: JobPostEntity[];
  total: number;
}

export interface IJobPostRepository extends IBaseRepository<JobPostEntity> {
  findByRecruiterId(recruiterId: string): Promise<JobPostEntity[]>;
  findByStatus(status: JobStatus): Promise<JobPostEntity[]>;
  createWithSkills(
    data: Partial<JobPostEntity>,
    skillIds: string[],
  ): Promise<JobPostEntity>;
  findByIdWithSkills(id: string): Promise<JobPostEntity | null>;
  updateWithSkills(
    id: string,
    data: Partial<JobPostEntity>,
    skillIds: string[],
  ): Promise<JobPostEntity>;
  findOpenJobs(params: FindOpenJobsParams): Promise<FindOpenJobsResult>;
  findOpenJobById(id: string): Promise<JobPostEntity | null>;
}

export const IJobPostRepository = Symbol('IJobPostRepository');
