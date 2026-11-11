import { ReportEntity, ReportStatus } from './report.entity';

describe('ReportEntity', () => {
  const validPayload = {
    id: 'report-123',
    displayId: 'RPT-12345678',
    reporterId: 'worker-user-1',
    reportedUserId: 'recruiter-user-1',
    jobPostId: 'job-post-1',
    reportType: 'JOB_POST_ISSUE',
    description:
      'The job posting asks for inappropriate up-front payment fees.',
    evidenceFileUrl: 'https://storage.gigly.com/reports/evidence/abc.png',
    status: ReportStatus.PENDING,
    adminNotes: null,
    resolvedBy: null,
    createdAt: new Date('2026-11-10T10:00:00Z'),
    updatedAt: new Date('2026-11-10T10:00:00Z'),
  };

  it('creates an entity with valid payload', () => {
    const report = new ReportEntity(validPayload);
    expect(report.id).toBe('report-123');
    expect(report.displayId).toBe('RPT-12345678');
    expect(report.reporterId).toBe('worker-user-1');
    expect(report.reportedUserId).toBe('recruiter-user-1');
    expect(report.jobPostId).toBe('job-post-1');
    expect(report.reportType).toBe('JOB_POST_ISSUE');
    expect(report.description).toBe(
      'The job posting asks for inappropriate up-front payment fees.',
    );
    expect(report.evidenceFileUrl).toBe(
      'https://storage.gigly.com/reports/evidence/abc.png',
    );
    expect(report.status).toBe(ReportStatus.PENDING);
    expect(report.adminNotes).toBeNull();
    expect(report.resolvedBy).toBeNull();
  });

  it('defaults optional fields properly', () => {
    const minimalPayload = {
      id: 'report-456',
      displayId: 'RPT-87654321',
      reporterId: 'worker-user-2',
      reportedUserId: 'recruiter-user-2',
      reportType: 'JOB_POST_ISSUE',
      description: 'Misleading job details.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const report = new ReportEntity(minimalPayload);
    expect(report.status).toBe(ReportStatus.PENDING);
    expect(report.jobPostId).toBeNull();
    expect(report.evidenceFileUrl).toBeNull();
    expect(report.adminNotes).toBeNull();
    expect(report.resolvedBy).toBeNull();
  });

  it('throws when reporterId is missing or empty', () => {
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          reporterId: '',
        }),
    ).toThrow('reporterId must be a non-empty string');

    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          reporterId: '   ',
        }),
    ).toThrow('reporterId must be a non-empty string');
  });

  it('throws when reportedUserId is missing or empty', () => {
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          reportedUserId: '',
        }),
    ).toThrow('reportedUserId must be a non-empty string');
  });

  it('throws when reportType is missing or empty', () => {
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          reportType: '',
        }),
    ).toThrow('reportType must be a non-empty string');
  });

  it('throws when description is empty or whitespace only', () => {
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          description: '',
        }),
    ).toThrow('description must be a non-empty string');

    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          description: '    \n  \t ',
        }),
    ).toThrow('description must be a non-empty string');
  });

  it('throws when description exceeds 500 characters', () => {
    const longDesc = 'a'.repeat(501);
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          description: longDesc,
        }),
    ).toThrow('description cannot exceed 500 characters');
  });

  it('accepts a description of exactly 500 characters', () => {
    const desc500 = 'a'.repeat(500);
    const report = new ReportEntity({
      ...validPayload,
      description: desc500,
    });
    expect(report.description.length).toBe(500);
  });

  it('throws when status is invalid', () => {
    expect(
      () =>
        new ReportEntity({
          ...validPayload,
          status: 'unknown_status' as any,
        }),
    ).toThrow('status must be one of: pending, resolved, dismissed');
  });
});
