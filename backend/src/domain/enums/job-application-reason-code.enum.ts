/**
 * Standardized reason codes for JobApplicationStatusHistory audit entries.
 * Extensible for Feature 5 cancellation and job-history events.
 */
export const JobApplicationReasonCode = {
  APPLICATION_SUBMITTED: 'application_submitted',
  RECRUITER_SHORTLISTED: 'recruiter_shortlisted',
  RECRUITER_ACCEPTED: 'recruiter_accepted',
  RECRUITER_REJECTED: 'recruiter_rejected',
  JOB_FILLED: 'job_filled',
  SCHEDULE_CONFLICT: 'schedule_conflict',
  LEGACY_BASELINE: 'legacy_baseline',
} as const;

export type JobApplicationReasonCode =
  | (typeof JobApplicationReasonCode)[keyof typeof JobApplicationReasonCode]
  | (string & {});

export const FEATURE_4_JOB_APPLICATION_REASON_CODES = [
  JobApplicationReasonCode.APPLICATION_SUBMITTED,
  JobApplicationReasonCode.RECRUITER_SHORTLISTED,
  JobApplicationReasonCode.RECRUITER_ACCEPTED,
  JobApplicationReasonCode.RECRUITER_REJECTED,
  JobApplicationReasonCode.JOB_FILLED,
  JobApplicationReasonCode.SCHEDULE_CONFLICT,
  JobApplicationReasonCode.LEGACY_BASELINE,
] as const;
