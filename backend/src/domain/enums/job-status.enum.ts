export const JobStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  FILLED: 'filled',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
