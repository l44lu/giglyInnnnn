import type { Skill } from "./worker-profile";

/**
 * Supported work arrangements for job posts.
 */
export const WorkType = {
  REMOTE: "remote",
  LOCAL: "local",
} as const;

export type WorkType = (typeof WorkType)[keyof typeof WorkType];

/**
 * Supported compensation structures for job posts.
 */
export const PaymentStructure = {
  FIXED: "fixed",
  HOURLY: "hourly",
} as const;

export type PaymentStructure =
  (typeof PaymentStructure)[keyof typeof PaymentStructure];

/**
 * Lifecycle status values of a job post.
 */
export const JobStatus = {
  DRAFT: "draft",
  OPEN: "open",
  FILLED: "filled",
  PAUSED: "paused",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/**
 * Supported status tabs for the recruiter My Postings view.
 * Matches backend RecruiterJobStatusFilter enum.
 */
export const RecruiterJobStatusFilter = {
  ALL: "all",
  ACTIVE: "active",
  DRAFT: "draft",
  PAUSED: "paused",
  CLOSED: "closed",
} as const;

export type RecruiterJobStatusFilter =
  (typeof RecruiterJobStatusFilter)[keyof typeof RecruiterJobStatusFilter];

/**
 * Global summary metrics across all job postings owned by the recruiter.
 * Matches backend RecruiterJobPostsSummaryDto.
 */
export interface RecruiterJobPostsSummary {
  total: number;
  active: number;
  draft: number;
  paused: number;
  closed: number;
  activeLocal: number;
  activeRemote: number;
}

/**
 * Query parameters for fetching recruiter job postings.
 * Matches backend GetRecruiterJobsQueryDto.
 */
export interface GetRecruiterJobsQuery {
  status?: RecruiterJobStatusFilter;
}

/**
 * Complete response contract for GET /recruiter/jobs.
 * Matches backend GetRecruiterJobPostsResponseDto.
 */
export interface GetRecruiterJobPostsResponse {
  summary: RecruiterJobPostsSummary;
  items: JobPost[];
}

/**
 * Job category entity returned by the public category endpoint.
 */
export interface JobCategory {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Request payload for creating a draft job post.
 * Matches backend CreateDraftJobPostInputDto.
 */
export interface CreateDraftJobPostPayload {
  categoryId: string;
  title: string;
  description: string;
  workType: WorkType;
  paymentStructure: PaymentStructure;
  skillIds?: string[];
  workersNeeded?: number;
  startDate?: string | null;
  estimatedDuration?: string | null;
  shiftDuration?: string | null;
  jobLocation?: string | null;
  jobLocationLat?: number | null;
  jobLocationLng?: number | null;
  budgetAmount?: number | null;
  hourlyRate?: number | null;
}

/**
 * Request payload for updating an existing job post.
 * Matches backend UpdateJobPostInputDto.
 */
export interface UpdateJobPostPayload {
  categoryId: string;
  title: string;
  description: string;
  workType: WorkType;
  paymentStructure: PaymentStructure;
  skillIds?: string[];
  workersNeeded?: number;
  startDate?: string | null;
  estimatedDuration?: string | null;
  shiftDuration?: string | null;
  jobLocation?: string | null;
  jobLocationLat?: number | null;
  jobLocationLng?: number | null;
  budgetAmount?: number | null;
  hourlyRate?: number | null;
}

/**
 * Complete Job Post entity returned by the backend Job Posting endpoints.
 * Matches backend JobPostResponseDto.
 */
export interface JobPost {
  id: string;
  recruiterId: string;
  categoryId: string;
  title: string;
  description: string;
  workType: WorkType;
  workersNeeded: number;
  startDate: string | null;
  estimatedDuration: string | null;
  shiftDuration: string | null;
  jobLocation: string | null;
  jobLocationLat: number | null;
  jobLocationLng: number | null;
  paymentStructure: PaymentStructure;
  budgetAmount: number | null;
  hourlyRate: number | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  status: JobStatus;
  isBoosted: boolean;
  boostExpiresAt: string | null;
  adminReviewStatus: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  category?: JobCategory;
  skills?: Skill[];
}

/**
 * Sorting options for worker job discovery.
 * Matches backend JobSortBy enum.
 */
export const JobSortBy = {
  RECENT: "recent",
  PAY_HIGH: "pay_high",
  PAY_LOW: "pay_low",
} as const;

export type JobSortBy = (typeof JobSortBy)[keyof typeof JobSortBy];

/**
 * Query parameters for worker job discovery.
 * Matches backend FindJobsQueryDto.
 */
export interface FindJobsQuery {
  search?: string;
  categoryId?: string;
  workType?: WorkType;
  location?: string;
  paymentStructure?: PaymentStructure;
  minPay?: number;
  maxPay?: number;
  skillIds?: string[];
  sortBy?: JobSortBy;
  page?: number;
  limit?: number;
}

/**
 * Public recruiter company information returned with a job post.
 * Matches backend JobDiscoveryCompanyDto.
 */
export interface JobDiscoveryCompany {
  id: string | null;
  name: string;
  logoUrl: string | null;
}

/**
 * Category information returned with a discovery job post.
 * Matches backend JobCategoryResponseDto.
 */
export interface JobDiscoveryCategory {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Skill tag returned with a discovery job post.
 * Matches backend SkillResponseDto.
 */
export interface JobDiscoverySkill {
  id: string;
  name: string;
}

/**
 * Worker discovery job post item returned in search/listing results.
 * Matches backend JobDiscoveryItemDto.
 */
export interface JobDiscoveryItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  workType: WorkType;
  workersNeeded: number;
  startDate: string | null;
  estimatedDuration: string | null;
  shiftDuration: string | null;
  jobLocation: string | null;
  jobLocationLat: number | null;
  jobLocationLng: number | null;
  paymentStructure: PaymentStructure;
  budgetAmount: number | null;
  hourlyRate: number | null;
  status: JobStatus;
  createdAt: string;
  category?: JobDiscoveryCategory;
  skills?: JobDiscoverySkill[];
  company?: JobDiscoveryCompany | null;
}

/**
 * Standard pagination metadata returned with discovery results.
 * Matches backend PaginationMetadataDto.
 */
export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Complete response contract for GET /worker/jobs.
 * Matches backend FindJobsResponseDto.
 */
export interface FindJobsResponse {
  items: JobDiscoveryItem[];
  pagination: PaginationMetadata;
}

/**
 * Detailed company information returned in worker job details view.
 * Matches backend WorkerJobDetailsCompanyDto.
 */
export interface WorkerJobDetailsCompany {
  id: string | null;
  name: string;
  logoUrl: string | null;
  about: string | null;
  industry: string | null;
  website: string | null;
  headquartersLocation: string | null;
}

/**
 * Public recruiter profile information returned in worker job details view.
 * Excludes all private contact details, password hashes, and internal identifiers.
 * Matches backend WorkerJobDetailsRecruiterDto.
 */
export interface WorkerJobDetailsRecruiter {
  name: string;
  roleTitle: string | null;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
}

/**
 * Complete single job post details response for authenticated worker.
 * Matches backend WorkerJobDetailsResponseDto from GET /worker/jobs/:id.
 */
export interface WorkerJobDetails {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  workType: WorkType;
  workersNeeded: number;
  startDate: string | null;
  estimatedDuration: string | null;
  shiftDuration: string | null;
  jobLocation: string | null;
  jobLocationLat: number | null;
  jobLocationLng: number | null;
  paymentStructure: PaymentStructure;
  budgetAmount: number | null;
  hourlyRate: number | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  category?: JobDiscoveryCategory;
  skills?: JobDiscoverySkill[];
  company?: WorkerJobDetailsCompany | null;
  recruiter?: WorkerJobDetailsRecruiter | null;
}

/**
 * Input payload for reporting a job post.
 * Matches backend multipart fields on POST /worker/jobs/:id/report.
 */
export interface ReportJobInput {
  description: string;
  evidence?: File | null;
}

/**
 * Successful response returned when a report is created.
 * Matches backend ReportJobResponseDto.
 */
export interface ReportJobResponse {
  id: string;
  displayId: string;
  jobPostId: string;
  status: string;
  createdAt: string;
}
