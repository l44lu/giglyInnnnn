export const WorkType = {
  REMOTE: 'remote',
  LOCAL: 'local',
} as const;

export type WorkType = (typeof WorkType)[keyof typeof WorkType];
