import axios from "axios";
import api from "./api";
import { baseURL } from "./api";
import type {
  WorkerProfileResponse,
  Skill,
  WorkerSkill,
  UpdateWorkerSkillsPayload,
} from "@/types/worker-profile";
import type { User } from "@/types/auth";
import type {
  FindJobsQuery,
  FindJobsResponse,
  WorkerJobDetails,
  ReportJobInput,
  ReportJobResponse,
} from "@/types/job";

export interface UpdateWorkerPersonalProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}

/**
 * Deterministically parses a full-name string into firstName and lastName.
 * Trims leading/trailing whitespace.
 * The first token becomes firstName, remaining text becomes lastName.
 * Single name yields empty string for lastName.
 */
export const parseFullName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return {
      firstName: trimmed,
      lastName: "",
    };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
};

/**
 * Converts empty or whitespace-only field inputs to null for backend clearing,
 * or returns the trimmed string value.
 */
export const formatNullableField = (
  val: string | null | undefined,
): string | null => {
  if (val === null || val === undefined) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Fetches the worker profile for the authenticated worker.
 * Returns null if the profile has not yet been initialized (404 Not Found).
 */
export const getWorkerProfile =
  async (): Promise<WorkerProfileResponse | null> => {
    try {
      const response = await api.get<WorkerProfileResponse>("/worker/profile");
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

/**
 * Updates the worker personal profile information (name, phone, location, bio).
 * Dispatches PATCH /worker/profile/personal with HttpOnly credentials.
 * Returns the updated User record.
 */
export const updateWorkerPersonalProfile = async (
  payload: UpdateWorkerPersonalProfilePayload,
): Promise<User> => {
  const response = await api.patch<User>("/worker/profile/personal", payload);
  return response.data;
};

export interface UpdateWorkerProfilePayload {
  headline?: string | null;
  yearsExperience?: number | null;
  responseTimeHours?: number | null;
  availabilityStatus?: string;
  isOpenToWork?: boolean;
}

/**
 * Converts a string input into a non-negative integer or null.
 * Returns null if the trimmed input is empty.
 * Returns NaN if the value is not a valid non-negative integer.
 */
export const parseIntegerOrNull = (
  val: string | null | undefined,
): number | null => {
  if (val === null || val === undefined) return null;
  const trimmed = val.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) {
    return NaN;
  }
  return num;
};

/**
 * Updates the worker professional profile (headline, response time, open to work, etc.).
 * Dispatches PATCH /worker/profile with HttpOnly credentials.
 * Returns the updated WorkerProfileResponse record.
 */
export const updateWorkerProfile = async (
  payload: UpdateWorkerProfilePayload,
): Promise<WorkerProfileResponse> => {
  const response = await api.patch<WorkerProfileResponse>(
    "/worker/profile",
    payload,
  );
  return response.data;
};

/**
 * Fetches the complete curated marketplace skill catalog.
 * Dispatches GET /skills.
 * Returns an array of available catalog skills.
 */
export const getSkillCatalog = async (): Promise<Skill[]> => {
  const response = await api.get<Skill[]>("/skills");
  return response.data;
};

/**
 * Fetches the authenticated worker's assigned skills.
 * Dispatches GET /worker/skills with HttpOnly credentials.
 * Returns an array of assigned worker skills (empty array if no skills assigned).
 */
export const getWorkerSkills = async (): Promise<WorkerSkill[]> => {
  const response = await api.get<WorkerSkill[]>("/worker/skills");
  return response.data;
};

/**
 * Atomically updates the authenticated worker's assigned skills.
 * Dispatches PUT /worker/skills with HttpOnly credentials.
 * Accepts an array of skill IDs and returns the updated worker skills.
 */
export const updateWorkerSkills = async (
  skillIds: string[],
): Promise<WorkerSkill[]> => {
  const payload: UpdateWorkerSkillsPayload = { skillIds };
  const response = await api.put<WorkerSkill[]>("/worker/skills", payload);
  return response.data;
};

let currentAvatarVersion: number | undefined;

export const getAvatarVersion = (): number | undefined => currentAvatarVersion;

export const setAvatarVersion = (v: number): void => {
  currentAvatarVersion = v;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gigly:avatar-version-updated", { detail: v }),
    );
  }
};

export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Validates selected avatar file against MIME types and size constraints client-side.
 * Returns an error message string if invalid, or null if valid.
 */
export const validateAvatarFile = (file: {
  type: string;
  size: number;
}): string | null => {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return "Avatar file size exceeds the 2MB limit.";
  }
  return null;
};

/**
 * Resolves a full, credentialed avatar endpoint URL using the configured API baseURL.
 * Supports an optional version/timestamp query parameter for cache-busting.
 */
export const getAuthenticatedAvatarUrl = (
  url?: string | null,
  version?: string | number,
): string | null => {
  if (!url || typeof url !== "string" || url.trim() === "") return null;
  const trimmed = url.trim();
  const base =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `${baseURL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  if (!version) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${version}`;
};

/**
 * Uploads a profile avatar image for the authenticated worker.
 * Dispatches POST /worker/profile/avatar as multipart/form-data.
 * Field name MUST be 'file'.
 * Returns the response containing { avatarUrl: string }.
 */
export const uploadWorkerAvatar = async (
  file: File,
): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ avatarUrl: string }>(
    "/worker/profile/avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

/**
 * Removes the authenticated worker's profile avatar image.
 * Dispatches DELETE /worker/profile/avatar with HttpOnly credentials.
 * The backend identity is derived from the authenticated session.
 * Returns the response containing { avatarUrl: null }.
 */
export const removeWorkerAvatar = async (): Promise<{ avatarUrl: null }> => {
  const response = await api.delete<{ avatarUrl: null }>(
    "/worker/profile/avatar",
  );
  return response.data;
};

/**
 * Fetches the authenticated worker's profile avatar image as a Blob using the configured Axios client.
 * Inherits withCredentials: true and single-flight 401 token-refresh interceptors from api.
 * Accepts an optional avatarVersion (string or number) to bypass browser caching when updated.
 * Returns the Blob on success, or null if the worker has no avatar or the avatar is not found (404).
 * Re-throws other unexpected server or network errors.
 */
export const fetchWorkerAvatarBlob = async (
  avatarVersion?: string | number,
): Promise<Blob | null> => {
  try {
    const response = await api.get<Blob>("/worker/profile/avatar", {
      responseType: "blob",
      params: avatarVersion !== undefined ? { v: avatarVersion } : undefined,
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Formats and normalizes query parameters for GET /worker/jobs:
 * - Omits undefined, null, and empty string filters.
 * - Preserves valid numeric values, including 0 (e.g. minPay: 0, maxPay: 0).
 * - Preserves numeric page and limit.
 * - Serializes skillIds as a comma-separated string, avoiding Axios bracket notation ("skillIds[]").
 */
export const formatFindJobsParams = (
  query?: FindJobsQuery,
): Record<string, string | number> | undefined => {
  if (!query) return undefined;

  const params: Record<string, string | number> = {};

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.search = query.search.trim();
  }

  if (
    typeof query.categoryId === "string" &&
    query.categoryId.trim().length > 0
  ) {
    params.categoryId = query.categoryId.trim();
  }

  if (
    query.workType &&
    typeof query.workType === "string" &&
    query.workType.trim().length > 0
  ) {
    params.workType = query.workType;
  }

  if (typeof query.location === "string" && query.location.trim().length > 0) {
    params.location = query.location.trim();
  }

  if (
    query.paymentStructure &&
    typeof query.paymentStructure === "string" &&
    query.paymentStructure.trim().length > 0
  ) {
    params.paymentStructure = query.paymentStructure;
  }

  if (typeof query.minPay === "number" && !isNaN(query.minPay)) {
    params.minPay = query.minPay;
  }

  if (typeof query.maxPay === "number" && !isNaN(query.maxPay)) {
    params.maxPay = query.maxPay;
  }

  if (Array.isArray(query.skillIds) && query.skillIds.length > 0) {
    const cleanSkills = query.skillIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter((id) => id.length > 0);
    if (cleanSkills.length > 0) {
      params.skillIds = cleanSkills.join(",");
    }
  }

  if (
    query.sortBy &&
    typeof query.sortBy === "string" &&
    query.sortBy.trim().length > 0
  ) {
    params.sortBy = query.sortBy;
  }

  if (typeof query.page === "number" && !isNaN(query.page)) {
    params.page = query.page;
  }

  if (typeof query.limit === "number" && !isNaN(query.limit)) {
    params.limit = query.limit;
  }

  return Object.keys(params).length > 0 ? params : undefined;
};

/**
 * Fetches open jobs for worker job discovery with filtering, search, and pagination.
 * Dispatches GET /worker/jobs with HttpOnly credentials.
 * Automatically unwrapped by the api response interceptor.
 */
export const findOpenJobs = async (
  query?: FindJobsQuery,
): Promise<FindJobsResponse> => {
  const params = formatFindJobsParams(query);
  const response = await api.get<FindJobsResponse>("/worker/jobs", {
    ...(params ? { params } : {}),
  });
  return response.data;
};

/**
 * Fetches the full public details of a single open job post for worker discovery.
 * Dispatches GET /worker/jobs/:id with HttpOnly credentials.
 * Automatically unwrapped by the api response interceptor.
 */
export const getWorkerJobDetails = async (
  id: string,
): Promise<WorkerJobDetails> => {
  const cleanId = id.trim();
  const response = await api.get<WorkerJobDetails>(
    `/worker/jobs/${encodeURIComponent(cleanId)}`,
  );
  return response.data;
};

export const ALLOWED_REPORT_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ALLOWED_REPORT_EVIDENCE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
];

export const MAX_REPORT_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_REPORT_DESCRIPTION_LENGTH = 500;

/**
 * Validates selected report evidence file against MIME types, file extensions, and size constraints.
 * Returns an error message string if invalid, or null if valid.
 */
export const validateReportEvidenceFile = (file: {
  name?: string;
  type?: string;
  size: number;
}): string | null => {
  if (file.size > MAX_REPORT_EVIDENCE_FILE_SIZE) {
    return "Evidence file exceeds the 5MB upload limit.";
  }
  const typeMatches = Boolean(
    file.type &&
    ALLOWED_REPORT_EVIDENCE_MIME_TYPES.includes(file.type.toLowerCase()),
  );
  const extMatches = Boolean(
    file.name &&
    ALLOWED_REPORT_EVIDENCE_EXTENSIONS.some((ext) =>
      file.name!.toLowerCase().endsWith(ext),
    ),
  );
  if (!typeMatches && !extMatches) {
    return "Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF file.";
  }
  return null;
};

/**
 * Submits a report for a specific job post with an issue description and optional evidence file.
 * Dispatches POST /worker/jobs/:id/report as multipart/form-data.
 * Content-Type is left undefined so Axios and browser construct boundary automatically.
 * Automatically unwrapped by api response interceptor.
 */
export const reportJob = async (
  jobId: string,
  input: ReportJobInput,
): Promise<ReportJobResponse> => {
  const cleanId = jobId.trim();
  const formData = new FormData();
  formData.append("description", input.description.trim());
  if (input.evidence) {
    formData.append("evidence", input.evidence);
  }

  const response = await api.post<ReportJobResponse>(
    `/worker/jobs/${encodeURIComponent(cleanId)}/report`,
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    },
  );
  return response.data;
};
