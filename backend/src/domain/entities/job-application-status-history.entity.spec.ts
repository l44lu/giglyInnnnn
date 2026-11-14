import { JobApplicationStatusHistoryEntity } from './job-application-status-history.entity';
import { JobApplicationStatus } from '../enums/job-application-status.enum';
import {
  FEATURE_4_JOB_APPLICATION_REASON_CODES,
  JobApplicationReasonCode,
} from '../enums/job-application-reason-code.enum';

describe('JobApplicationStatusHistoryEntity & Reason Codes', () => {
  const validPayload = {
    id: 'history-uuid-1',
    applicationId: 'app-uuid-1',
    fromStatus: null,
    toStatus: JobApplicationStatus.PENDING,
    reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
    reasonNote: null,
    changedByUserId: 'user-uuid-1',
    metadata: null,
    createdAt: new Date('2026-11-12T08:00:00.000Z'),
  };

  it('defines all required Stage 1 reason code constants', () => {
    expect(JobApplicationReasonCode.APPLICATION_SUBMITTED).toBe(
      'application_submitted',
    );
    expect(JobApplicationReasonCode.RECRUITER_SHORTLISTED).toBe(
      'recruiter_shortlisted',
    );
    expect(JobApplicationReasonCode.RECRUITER_ACCEPTED).toBe(
      'recruiter_accepted',
    );
    expect(JobApplicationReasonCode.RECRUITER_REJECTED).toBe(
      'recruiter_rejected',
    );
    expect(JobApplicationReasonCode.JOB_FILLED).toBe('job_filled');
    expect(JobApplicationReasonCode.SCHEDULE_CONFLICT).toBe(
      'schedule_conflict',
    );
    expect(JobApplicationReasonCode.LEGACY_BASELINE).toBe('legacy_baseline');

    expect(FEATURE_4_JOB_APPLICATION_REASON_CODES).toEqual([
      'application_submitted',
      'recruiter_shortlisted',
      'recruiter_accepted',
      'recruiter_rejected',
      'job_filled',
      'schedule_conflict',
      'legacy_baseline',
    ]);
  });

  it('creates an initial history entry with null fromStatus and worker user ID', () => {
    const entity = new JobApplicationStatusHistoryEntity(validPayload);

    expect(entity.id).toBe('history-uuid-1');
    expect(entity.applicationId).toBe('app-uuid-1');
    expect(entity.fromStatus).toBeNull();
    expect(entity.toStatus).toBe(JobApplicationStatus.PENDING);
    expect(entity.reasonCode).toBe('application_submitted');
    expect(entity.reasonNote).toBeNull();
    expect(entity.changedByUserId).toBe('user-uuid-1');
    expect(entity.metadata).toBeNull();
    expect(entity.createdAt).toEqual(new Date('2026-11-12T08:00:00.000Z'));
  });

  it('supports automatic system transitions with null changedByUserId and JSON metadata', () => {
    const entity = new JobApplicationStatusHistoryEntity({
      id: 'history-uuid-2',
      applicationId: 'app-uuid-1',
      fromStatus: JobApplicationStatus.PENDING,
      toStatus: JobApplicationStatus.WITHDRAWN,
      reasonCode: JobApplicationReasonCode.SCHEDULE_CONFLICT,
      reasonNote: 'Automatically withdrawn due to conflicting gig acceptance',
      changedByUserId: null,
      metadata: {
        conflictingJobPostId: 'job-uuid-99',
        conflictDate: '2026-12-15',
      },
      createdAt: new Date('2026-11-12T08:05:00.000Z'),
    });

    expect(entity.fromStatus).toBe(JobApplicationStatus.PENDING);
    expect(entity.toStatus).toBe(JobApplicationStatus.WITHDRAWN);
    expect(entity.changedByUserId).toBeNull();
    expect(entity.metadata).toEqual({
      conflictingJobPostId: 'job-uuid-99',
      conflictDate: '2026-12-15',
    });
  });

  it('allows future extensible Feature 5 reason codes without breaking invariants', () => {
    const entity = new JobApplicationStatusHistoryEntity({
      ...validPayload,
      fromStatus: JobApplicationStatus.ACCEPTED,
      toStatus: JobApplicationStatus.WITHDRAWN,
      reasonCode: 'job_cancelled',
    });

    expect(entity.reasonCode).toBe('job_cancelled');
  });

  it('rejects invalid invariants', () => {
    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          applicationId: '   ',
        }),
    ).toThrow('applicationId must be a non-empty string');

    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          fromStatus: 'bogus' as JobApplicationStatus,
        }),
    ).toThrow(/fromStatus must be one of:/);

    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          toStatus: 'bogus' as JobApplicationStatus,
        }),
    ).toThrow(/toStatus must be one of:/);

    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          reasonCode: '',
        }),
    ).toThrow('reasonCode must be a non-empty string');

    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          changedByUserId: '  ',
        }),
    ).toThrow('changedByUserId must be a non-empty string or null');

    expect(
      () =>
        new JobApplicationStatusHistoryEntity({
          ...validPayload,
          metadata: ['not-an-object'] as unknown as Record<string, unknown>,
        }),
    ).toThrow('metadata must be a JSON object or null');
  });
});
