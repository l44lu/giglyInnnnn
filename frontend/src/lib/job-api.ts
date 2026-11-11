import api from "./api";
import type {
  JobCategory,
  CreateDraftJobPostPayload,
  UpdateJobPostPayload,
  JobPost,
  GetRecruiterJobsQuery,
  GetRecruiterJobPostsResponse,
} from "@/types/job";

/**
 * Fetches all available job categories for job posting.
 * Dispatches GET /job-categories.
 * Public endpoint.
 */
export const getJobCategories = async (): Promise<JobCategory[]> => {
  const response = await api.get<JobCategory[]>("/job-categories");
  return response.data;
};

/**
 * Creates a new draft job post for the authenticated recruiter.
 * Dispatches POST /recruiter/jobs/draft with HttpOnly credentials.
 * Recruiter-only endpoint.
 */
export const createDraftJobPost = async (
  payload: CreateDraftJobPostPayload,
): Promise<JobPost> => {
  const response = await api.post<JobPost>("/recruiter/jobs/draft", payload);
  return response.data;
};

/**
 * Publishes an existing draft job post owned by the authenticated recruiter.
 * Dispatches PATCH /recruiter/jobs/:id/publish with HttpOnly credentials.
 * Recruiter-only endpoint.
 */
export const publishJobPost = async (jobPostId: string): Promise<JobPost> => {
  const response = await api.patch<JobPost>(
    `/recruiter/jobs/${jobPostId}/publish`,
  );
  return response.data;
};

/**
 * Fetches all job postings owned by the authenticated recruiter with summary counts.
 * Dispatches GET /recruiter/jobs with optional status filter.
 * Recruiter-only endpoint.
 */
export const getRecruiterJobPosts = async (
  query?: GetRecruiterJobsQuery,
): Promise<GetRecruiterJobPostsResponse> => {
  const response = await api.get<GetRecruiterJobPostsResponse>(
    "/recruiter/jobs",
    {
      params: query,
    },
  );
  return response.data;
};

/**
 * Fetches a single job post by ID owned by the authenticated recruiter.
 * Dispatches GET /recruiter/jobs/:id.
 * Recruiter-only endpoint.
 */
export const getRecruiterJobPostById = async (id: string): Promise<JobPost> => {
  const response = await api.get<JobPost>(`/recruiter/jobs/${id}`);
  return response.data;
};

/**
 * Updates an existing job post owned by the authenticated recruiter.
 * Dispatches PATCH /recruiter/jobs/:id.
 * Recruiter-only endpoint.
 */
export const updateRecruiterJobPost = async (
  id: string,
  payload: UpdateJobPostPayload,
): Promise<JobPost> => {
  const response = await api.patch<JobPost>(`/recruiter/jobs/${id}`, payload);
  return response.data;
};

/**
 * Pauses an active job post owned by the authenticated recruiter.
 * Dispatches PATCH /recruiter/jobs/:id/pause.
 * Recruiter-only endpoint.
 */
export const pauseRecruiterJobPost = async (id: string): Promise<JobPost> => {
  const response = await api.patch<JobPost>(`/recruiter/jobs/${id}/pause`);
  return response.data;
};

/**
 * Reopens a paused job post owned by the authenticated recruiter.
 * Dispatches PATCH /recruiter/jobs/:id/reopen.
 * Recruiter-only endpoint.
 */
export const reopenRecruiterJobPost = async (id: string): Promise<JobPost> => {
  const response = await api.patch<JobPost>(`/recruiter/jobs/${id}/reopen`);
  return response.data;
};

/**
 * Closes an open or paused job post owned by the authenticated recruiter.
 * Dispatches PATCH /recruiter/jobs/:id/close.
 * Recruiter-only endpoint.
 */
export const closeRecruiterJobPost = async (id: string): Promise<JobPost> => {
  const response = await api.patch<JobPost>(`/recruiter/jobs/${id}/close`);
  return response.data;
};
