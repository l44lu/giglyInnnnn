import { RecruiterJobApplicationMapper } from './recruiter-job-application.mapper';
import { FindJobApplicationsResult } from '../../domain/repositories/job-application.repository.interface';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { GetJobApplicationsResponseDto } from '../dto/job-posting/job-applications-response.dto';

describe('RecruiterJobApplicationMapper', () => {
  it('maps repository result to explicit response DTO and strips any sensitive or internal fields', () => {
    const rawResultWithExtraSensitiveFields = {
      job: {
        id: 'job-uuid-1',
        title: 'Event Setup Helper',
        status: JobStatus.OPEN,
        workersNeeded: 3,
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 25,
        acceptedCount: 1,
        recruiterId: 'recruiter-profile-uuid-1',
        adminNotes: 'Internal admin note',
        adminReviewStatus: 'approved',
      },
      summary: {
        total: 4,
        pending: 2,
        shortlisted: 1,
        accepted: 1,
        rejected: 0,
        withdrawn: 0,
      },
      total: 4,
      page: 1,
      limit: 10,
      items: [
        {
          id: 'app-uuid-1',
          jobPostId: 'job-uuid-1',
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.SHORTLISTED,
          expectedPay: 28,
          availableDate: new Date('2026-12-20T00:00:00.000Z'),
          appliedAt: new Date('2026-11-11T10:00:00.000Z'),
          updatedAt: new Date('2026-11-12T08:00:00.000Z'),
          worker: {
            id: 'worker-profile-uuid-1',
            userId: 'private-user-uuid-1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            phone: '+15551234567',
            passwordHash: 'secret-hash',
            roleId: 'role-uuid-1',
            isVerified: true,
            isBlocked: false,
            isActive: true,
            avatarUrl: 'avatars/worker/private-user-uuid-1/photo.jpg',
            location: 'Austin, TX',
            bio: 'Reliable technician',
            headline: 'Audio Tech',
            yearsExperience: 5,
            responseTimeHours: 2,
            availabilityStatus: 'available',
            isOpenToWork: true,
            totalCompletedGigs: 9,
            hasAvatar: true,
            skills: [{ id: 'skill-1', name: 'Rigging', skillType: 'CORE' }],
          },
          historySummary: {
            lastChangedAt: new Date('2026-11-12T08:00:00.000Z'),
            latestReasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
            transitionCount: 2,
            changedByUserId: 'internal-actor-uuid',
            metadata: { internalKey: 'secret' },
            reasonNote: 'Internal HR note',
          },
        },
      ],
    } as unknown as FindJobApplicationsResult;

    const dto = RecruiterJobApplicationMapper.toResponseDto(
      rawResultWithExtraSensitiveFields,
    );

    expect(dto).toBeInstanceOf(GetJobApplicationsResponseDto);
    expect(dto.job).toEqual({
      id: 'job-uuid-1',
      title: 'Event Setup Helper',
      status: JobStatus.OPEN,
      workersNeeded: 3,
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 25,
      acceptedCount: 1,
    });
    expect(dto.job).not.toHaveProperty('recruiterId');
    expect(dto.job).not.toHaveProperty('adminNotes');
    expect(dto.job).not.toHaveProperty('adminReviewStatus');

    expect(dto.summary).toEqual({
      total: 4,
      pending: 2,
      shortlisted: 1,
      accepted: 1,
      rejected: 0,
      withdrawn: 0,
    });

    expect(dto.pagination).toEqual({
      total: 4,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const item = dto.items[0];
    expect(item).toEqual({
      id: 'app-uuid-1',
      jobPostId: 'job-uuid-1',
      status: JobApplicationStatus.SHORTLISTED,
      expectedPay: 28,
      availableDate: new Date('2026-12-20T00:00:00.000Z'),
      appliedAt: new Date('2026-11-11T10:00:00.000Z'),
      updatedAt: new Date('2026-11-12T08:00:00.000Z'),
      worker: {
        id: 'worker-profile-uuid-1',
        firstName: 'Jane',
        lastName: 'Doe',
        location: 'Austin, TX',
        bio: 'Reliable technician',
        headline: 'Audio Tech',
        yearsExperience: 5,
        responseTimeHours: 2,
        availabilityStatus: 'available',
        isOpenToWork: true,
        totalCompletedGigs: 9,
        hasAvatar: true,
        skills: [{ id: 'skill-1', name: 'Rigging', skillType: 'CORE' }],
      },
      historySummary: {
        lastChangedAt: new Date('2026-11-12T08:00:00.000Z'),
        latestReasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
        transitionCount: 2,
      },
    });

    expect(item).not.toHaveProperty('workerId');
    expect(item.worker).not.toHaveProperty('userId');
    expect(item.worker).not.toHaveProperty('email');
    expect(item.worker).not.toHaveProperty('phone');
    expect(item.worker).not.toHaveProperty('passwordHash');
    expect(item.worker).not.toHaveProperty('roleId');
    expect(item.worker).not.toHaveProperty('isVerified');
    expect(item.worker).not.toHaveProperty('isBlocked');
    expect(item.worker).not.toHaveProperty('isActive');
    expect(item.worker).not.toHaveProperty('avatarUrl');
    expect(item.historySummary).not.toHaveProperty('changedByUserId');
    expect(item.historySummary).not.toHaveProperty('metadata');
    expect(item.historySummary).not.toHaveProperty('reasonNote');
  });

  it('computes totalPages as 0 when total is 0 and preserves null historySummary', () => {
    const emptyResult: FindJobApplicationsResult = {
      job: {
        id: 'job-uuid-2',
        title: 'Warehouse Shift',
        status: JobStatus.OPEN,
        workersNeeded: 2,
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 300,
        hourlyRate: null,
        acceptedCount: 0,
      },
      summary: {
        total: 0,
        pending: 0,
        shortlisted: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
      },
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    };

    const dto = RecruiterJobApplicationMapper.toResponseDto(emptyResult);
    expect(dto.pagination.totalPages).toBe(0);
    expect(dto.items).toEqual([]);
  });

  it('maps shortlist/reject results and accept results cleanly without exposing internal history/application lists', () => {
    const updatedAt = new Date('2026-11-12T12:00:00.000Z');
    const actionDto = RecruiterJobApplicationMapper.toStatusActionResponseDto({
      applicationId: 'app-uuid-1',
      jobPostId: 'job-uuid-1',
      previousStatus: JobApplicationStatus.PENDING,
      status: JobApplicationStatus.SHORTLISTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
      jobStatus: JobStatus.OPEN,
      updatedAt,
    });

    expect(actionDto).toEqual({
      applicationId: 'app-uuid-1',
      jobPostId: 'job-uuid-1',
      status: JobApplicationStatus.SHORTLISTED,
      jobStatus: JobStatus.OPEN,
      updatedAt,
    });
    expect(actionDto).not.toHaveProperty('reasonCode');
    expect(actionDto).not.toHaveProperty('previousStatus');

    const acceptDto = RecruiterJobApplicationMapper.toAcceptResponseDto({
      applicationId: 'app-uuid-1',
      jobPostId: 'job-uuid-1',
      previousStatus: JobApplicationStatus.SHORTLISTED,
      status: JobApplicationStatus.ACCEPTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
      jobStatus: JobStatus.FILLED,
      updatedAt,
      workersNeeded: 2,
      acceptedCount: 2,
      jobFilled: true,
      autoRejectedCount: 3,
      autoRejectedApplicationIds: ['app-2', 'app-3', 'app-4'],
    });

    expect(acceptDto).toEqual({
      applicationId: 'app-uuid-1',
      jobPostId: 'job-uuid-1',
      status: JobApplicationStatus.ACCEPTED,
      jobStatus: JobStatus.FILLED,
      workersNeeded: 2,
      acceptedCount: 2,
      jobFilled: true,
      autoRejectedCount: 3,
      updatedAt,
    });
    expect(acceptDto).not.toHaveProperty('autoRejectedApplicationIds');
    expect(acceptDto).not.toHaveProperty('reasonCode');
  });
});
