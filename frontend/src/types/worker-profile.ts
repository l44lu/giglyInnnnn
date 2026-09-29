export interface WorkerProfileResponse {
  id: string;
  userId: string;
  headline: string | null;
  yearsExperience: number | null;
  responseTimeHours: number | null;
  availabilityStatus: string;
  isOpenToWork: boolean;
  totalCompletedGigs: number;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface WorkerSkill {
  id: string;
  skillId: string;
  skillName: string;
}

export interface UpdateWorkerSkillsPayload {
  skillIds: string[];
}
