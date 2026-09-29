import axios from "axios";
import api from "./api";
import { baseURL } from "./api";
import type {
  RecruiterProfileResponse,
  UpdateRecruiterProfilePayload,
  UpdateRecruiterPersonalProfilePayload,
  Company,
  UpdateCompanyPayload,
} from "@/types/recruiter-profile";
import type { User } from "@/types/auth";

export {
  parseFullName,
  formatNullableField,
  parseIntegerOrNull,
} from "./worker-api";

/**
 * Fetches the recruiter profile for the authenticated recruiter.
 * Returns null if the profile has not yet been initialized (404 Not Found).
 */
export const getRecruiterProfile =
  async (): Promise<RecruiterProfileResponse | null> => {
    try {
      const response =
        await api.get<RecruiterProfileResponse>("/recruiter/profile");
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

/**
 * Updates the recruiter personal profile information (name, phone, location, bio).
 * Dispatches PATCH /recruiter/profile/personal with HttpOnly credentials.
 * Returns the updated User record.
 */
export const updateRecruiterPersonalProfile = async (
  payload: UpdateRecruiterPersonalProfilePayload,
): Promise<User> => {
  const response = await api.patch<User>(
    "/recruiter/profile/personal",
    payload,
  );
  return response.data;
};

/**
 * Updates the recruiter professional profile (roleTitle, yearsExperience, companyId).
 * Dispatches PATCH /recruiter/profile with HttpOnly credentials.
 * Returns the updated RecruiterProfileResponse record.
 */
export const updateRecruiterProfile = async (
  payload: UpdateRecruiterProfilePayload,
): Promise<RecruiterProfileResponse> => {
  const response = await api.patch<RecruiterProfileResponse>(
    "/recruiter/profile",
    payload,
  );
  return response.data;
};

let currentAvatarVersion: number | undefined;

export const getAvatarVersion = (): number | undefined => currentAvatarVersion;

export const setAvatarVersion = (v: number): void => {
  currentAvatarVersion = v;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gigly:recruiter-avatar-version-updated", { detail: v }),
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
 * Uploads a profile avatar image for the authenticated recruiter.
 * Dispatches POST /recruiter/profile/avatar as multipart/form-data.
 * Field name MUST be 'file'.
 * Returns the response containing { avatarUrl: string }.
 */
export const uploadRecruiterAvatar = async (
  file: File,
): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ avatarUrl: string }>(
    "/recruiter/profile/avatar",
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
 * Fetches the authenticated recruiter's profile avatar image as a Blob using the configured Axios client.
 * Inherits withCredentials: true and single-flight 401 token-refresh interceptors from api.
 * Accepts an optional avatarVersion (string or number) to bypass browser caching when updated.
 * Returns the Blob on success, or null if the recruiter has no avatar or the avatar is not found (404).
 * Re-throws other unexpected server or network errors.
 */
export const fetchRecruiterAvatarBlob = async (
  avatarVersion?: string | number,
): Promise<Blob | null> => {
  try {
    const response = await api.get<Blob>("/recruiter/profile/avatar", {
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
 * Fetches the company profile for the authenticated recruiter.
 * Returns null if no company profile is configured yet (404 Not Found).
 */
export const getRecruiterCompany = async (): Promise<Company | null> => {
  try {
    const response = await api.get<Company>("/recruiter/company");
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Updates or creates the company profile for the authenticated recruiter.
 * Dispatches PATCH /recruiter/company with HttpOnly credentials.
 * Returns the updated/created Company record.
 */
export const updateRecruiterCompany = async (
  payload: UpdateCompanyPayload,
): Promise<Company> => {
  const response = await api.patch<Company>("/recruiter/company", payload);
  return response.data;
};

let currentLogoVersion: number | undefined;

export const getLogoVersion = (): number | undefined => currentLogoVersion;

export const setLogoVersion = (v: number): void => {
  currentLogoVersion = v;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gigly:recruiter-company-logo-version-updated", {
        detail: v,
      }),
    );
  }
};

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Validates selected logo file against MIME types and size constraints client-side.
 * Returns an error message string if invalid, or null if valid.
 */
export const validateLogoFile = (file: {
  type: string;
  size: number;
}): string | null => {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type. Please select a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_LOGO_FILE_SIZE) {
    return "Company logo file size exceeds the 2MB limit.";
  }
  return null;
};

/**
 * Uploads a company logo image for the authenticated recruiter's company.
 * Dispatches POST /recruiter/company/logo as multipart/form-data.
 * Field name MUST be 'file'.
 * Returns the response containing { logoUrl: string }.
 */
export const uploadRecruiterCompanyLogo = async (
  file: File,
): Promise<{ logoUrl: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ logoUrl: string }>(
    "/recruiter/company/logo",
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
 * Fetches the authenticated recruiter's company logo image as a Blob using the configured Axios client.
 * Returns the Blob on success, or null if the company has no logo or the logo is not found (404).
 */
export const fetchRecruiterCompanyLogoBlob = async (
  logoVersion?: string | number,
): Promise<Blob | null> => {
  try {
    const response = await api.get<Blob>("/recruiter/company/logo", {
      responseType: "blob",
      params: logoVersion !== undefined ? { v: logoVersion } : undefined,
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
