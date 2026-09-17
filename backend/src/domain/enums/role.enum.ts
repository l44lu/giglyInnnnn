export const Role = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
  RECRUITER: 'RECRUITER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
