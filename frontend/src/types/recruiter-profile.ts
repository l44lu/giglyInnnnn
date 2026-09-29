export interface RecruiterProfileResponse {
  id: string;
  userId: string;
  companyId: string | null;
  roleTitle: string | null;
  yearsExperience: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  headquartersLocation: string | null;
  about: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRecruiterProfilePayload {
  roleTitle?: string | null;
  yearsExperience?: number | null;
}

export interface UpdateCompanyPayload {
  name?: string;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  headquartersLocation?: string | null;
  about?: string | null;
}

export interface UpdateRecruiterPersonalProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}
