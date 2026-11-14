import { Prisma } from '@prisma/client';
import { PrismaJobApplicationRepository } from './prisma-job-application.repository';
import { PrismaService } from '../prisma/prisma.service';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';
import { JobApplicationSortBy } from '../../domain/repositories/job-application.repository.interface';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../application/errors/application.errors';

describe('PrismaJobApplicationRepository', () => {
  let repository: PrismaJobApplicationRepository;
  let mockPrisma: any;
  let mockTx: any;

  const mockDbApplication = {
    id: 'app-uuid-1',
    jobPostId: 'job-post-uuid-1',
    workerId: 'worker-profile-uuid-1',
    status: 'pending',
    expectedPay: new Prisma.Decimal('145.50'),
    availableDate: new Date('2026-12-15T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T10:00:00.000Z'),
    updatedAt: new Date('2026-11-11T10:00:00.000Z'),
  };

  beforeEach(() => {
    mockTx = {
      $queryRaw: jest.fn(),
      jobApplication: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      jobPost: {
        update: jest.fn(),
      },
      jobApplicationStatusHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-uuid-1' }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockPrisma = {
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockTx),
      ),
      jobApplication: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      jobPost: {
        findUnique: jest.fn(),
      },
      jobApplicationStatusHistory: {
        create: jest.fn(),
      },
    };
    repository = new PrismaJobApplicationRepository(
      mockPrisma as PrismaService,
    );
  });

  describe('create', () => {
    it('atomically persists application and initial status history inside a transaction', async () => {
      mockTx.jobApplication.create.mockResolvedValue(mockDbApplication);

      const result = await repository.create({
        jobPostId: 'job-post-uuid-1',
        workerId: 'worker-profile-uuid-1',
        status: JobApplicationStatus.PENDING,
        expectedPay: 145.5,
        availableDate: new Date('2026-12-15T00:00:00.000Z'),
        reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
        changedByUserId: 'worker-user-uuid-1',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.jobApplication.create).not.toHaveBeenCalled();
      expect(mockTx.jobApplication.create).toHaveBeenCalledWith({
        data: {
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.PENDING,
          expectedPay: new Prisma.Decimal(145.5),
          availableDate: new Date('2026-12-15T00:00:00.000Z'),
        },
      });

      expect(mockTx.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-uuid-1',
          fromStatus: null,
          toStatus: JobApplicationStatus.PENDING,
          reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          reasonNote: null,
          changedByUserId: 'worker-user-uuid-1',
        },
      });

      expect(result.id).toBe('app-uuid-1');
      expect(result.jobPostId).toBe('job-post-uuid-1');
      expect(result.workerId).toBe('worker-profile-uuid-1');
      expect(result.status).toBe(JobApplicationStatus.PENDING);
      expect(result.expectedPay).toBe(145.5);
      expect(result.availableDate).toEqual(
        new Date('2026-12-15T00:00:00.000Z'),
      );
      expect(result.appliedAt).toEqual(mockDbApplication.appliedAt);
      expect(result.updatedAt).toEqual(mockDbApplication.updatedAt);
    });

    it('persists an application with null optional fields and defaults initial history reason', async () => {
      const minimalDb = {
        ...mockDbApplication,
        id: 'app-uuid-2',
        expectedPay: null,
        availableDate: null,
      };
      mockTx.jobApplication.create.mockResolvedValue(minimalDb);

      const result = await repository.create({
        jobPostId: 'job-post-uuid-1',
        workerId: 'worker-profile-uuid-1',
      });

      expect(mockTx.jobApplication.create).toHaveBeenCalledWith({
        data: {
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.PENDING,
          expectedPay: null,
          availableDate: null,
        },
      });

      expect(mockTx.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-uuid-2',
          fromStatus: null,
          toStatus: JobApplicationStatus.PENDING,
          reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          reasonNote: null,
          changedByUserId: null,
        },
      });

      expect(result.expectedPay).toBeNull();
      expect(result.availableDate).toBeNull();
    });

    it('propagates failure and aborts transaction if initial history insertion fails', async () => {
      mockTx.jobApplication.create.mockResolvedValue(mockDbApplication);
      mockTx.jobApplicationStatusHistory.create.mockRejectedValue(
        new Error('History constraint failure'),
      );

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
          changedByUserId: 'worker-user-uuid-1',
        }),
      ).rejects.toThrow('History constraint failure');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.jobApplication.create).not.toHaveBeenCalled();
    });

    it('translates Prisma P2002 on JobApplication_jobPostId_workerId_key to ApplicationConflictError', async () => {
      const duplicateError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the constraint: `JobApplication_jobPostId_workerId_key`',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['JobApplication_jobPostId_workerId_key'] },
        },
      );
      mockTx.jobApplication.create.mockRejectedValue(duplicateError);

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
        }),
      ).rejects.toThrow('You have already applied for this job');
      expect(mockTx.jobApplicationStatusHistory.create).not.toHaveBeenCalled();
    });

    it('translates Prisma P2002 when meta target contains composite fields [jobPostId, workerId]', async () => {
      const compositeError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`jobPostId`,`workerId`)',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['jobPostId', 'workerId'] },
        },
      );
      mockTx.jobApplication.create.mockRejectedValue(compositeError);

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);
    });

    it('re-throws unrelated Prisma P2002 errors without misclassification', async () => {
      const unrelatedError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on other field',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['other_unrelated_field_key'] },
        },
      );
      mockTx.jobApplication.create.mockRejectedValue(unrelatedError);

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
        }),
      ).rejects.toThrow(unrelatedError);
    });

    it('re-throws non-P2002 database errors as-is', async () => {
      const genericDbError = new Error('Database connection failed');
      mockTx.jobApplication.create.mockRejectedValue(genericDbError);

      await expect(
        repository.create({
          jobPostId: 'job-post-uuid-1',
          workerId: 'worker-profile-uuid-1',
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByJobAndWorker', () => {
    it('returns domain entity when existing application is found', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(mockDbApplication);

      const result = await repository.findByJobAndWorker(
        'job-post-uuid-1',
        'worker-profile-uuid-1',
      );

      expect(mockPrisma.jobApplication.findUnique).toHaveBeenCalledWith({
        where: {
          jobPostId_workerId: {
            jobPostId: 'job-post-uuid-1',
            workerId: 'worker-profile-uuid-1',
          },
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('app-uuid-1');
      expect(result?.jobPostId).toBe('job-post-uuid-1');
      expect(result?.workerId).toBe('worker-profile-uuid-1');
      expect(result?.expectedPay).toBe(145.5);
    });

    it('returns null when application does not exist', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null);

      const result = await repository.findByJobAndWorker(
        'job-post-uuid-1',
        'worker-profile-uuid-999',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByJobPostId', () => {
    const mockJobSelectResult = {
      id: 'job-post-uuid-1',
      title: 'Event Setup Crew',
      status: JobStatus.OPEN,
      workersNeeded: 3,
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRateMin: new Prisma.Decimal('28.50'),
      hourlyRateMax: new Prisma.Decimal('28.50'),
    };

    const mockApplicantPersistenceRow = {
      id: 'app-uuid-1',
      jobPostId: 'job-post-uuid-1',
      status: JobApplicationStatus.PENDING,
      expectedPay: new Prisma.Decimal('30.00'),
      availableDate: new Date('2026-12-15T00:00:00.000Z'),
      appliedAt: new Date('2026-11-11T10:00:00.000Z'),
      updatedAt: new Date('2026-11-11T12:00:00.000Z'),
      worker: {
        id: 'worker-profile-uuid-1',
        headline: 'Experienced Stage Technician',
        yearsExperience: 4,
        responseTimeHours: 2,
        availabilityStatus: 'available',
        isOpenToWork: true,
        totalCompletedGigs: 14,
        user: {
          firstName: 'Jane',
          lastName: 'Doe',
          location: 'Austin, TX',
          bio: 'Reliable event and staging specialist.',
          avatarUrl: 'avatars/worker/user-uuid-1/photo.jpg',
        },
        skills: [
          {
            skillType: 'CORE',
            skill: {
              id: 'skill-uuid-1',
              name: 'Audio Setup',
            },
          },
          {
            skillType: 'ADDITIONAL',
            skill: {
              id: 'skill-uuid-2',
              name: 'Lighting',
            },
          },
        ],
      },
      statusHistory: [
        {
          reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          createdAt: new Date('2026-11-11T10:00:00.000Z'),
        },
      ],
      _count: {
        statusHistory: 1,
      },
    };

    const defaultGroupByRows = [
      { status: JobApplicationStatus.PENDING, _count: { _all: 2 } },
      { status: JobApplicationStatus.SHORTLISTED, _count: { _all: 1 } },
      { status: JobApplicationStatus.ACCEPTED, _count: { _all: 1 } },
    ];

    it('returns null without querying applications when the job post does not exist', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(null);

      const result = await repository.findByJobPostId({
        jobPostId: 'missing-job-uuid',
      });

      expect(result).toBeNull();
      expect(mockPrisma.jobApplication.count).not.toHaveBeenCalled();
      expect(mockPrisma.jobApplication.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.jobApplication.groupBy).not.toHaveBeenCalled();
    });

    it('throws when jobPostId is empty', async () => {
      await expect(
        repository.findByJobPostId({ jobPostId: '   ' }),
      ).rejects.toThrow('jobPostId must be a non-empty string');
    });

    it('queries only requested job, enforces privacy-safe select clauses, and maps job/worker/skill/history read models', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(mockJobSelectResult);
      mockPrisma.jobApplication.count.mockResolvedValue(1);
      mockPrisma.jobApplication.findMany.mockResolvedValue([
        mockApplicantPersistenceRow,
      ]);
      mockPrisma.jobApplication.groupBy.mockResolvedValue(defaultGroupByRows);

      const result = await repository.findByJobPostId({
        jobPostId: '  job-post-uuid-1  ',
      });

      expect(mockPrisma.jobPost.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
        select: {
          id: true,
          title: true,
          status: true,
          workersNeeded: true,
          workType: true,
          paymentStructure: true,
          budgetAmount: true,
          hourlyRateMin: true,
          hourlyRateMax: true,
        },
      });

      expect(mockPrisma.jobApplication.count).toHaveBeenCalledWith({
        where: { jobPostId: 'job-post-uuid-1' },
      });

      const findManyArg = mockPrisma.jobApplication.findMany.mock.calls[0][0];
      expect(findManyArg.where).toEqual({ jobPostId: 'job-post-uuid-1' });
      expect(findManyArg.orderBy).toEqual([
        { appliedAt: 'desc' },
        { id: 'desc' },
      ]);
      expect(findManyArg.skip).toBe(0);
      expect(findManyArg.take).toBe(10);

      // Verify explicit privacy-safe select clauses omit sensitive fields
      const userSelect = findManyArg.select.worker.select.user.select;
      expect(userSelect).toEqual({
        firstName: true,
        lastName: true,
        location: true,
        bio: true,
        avatarUrl: true,
      });
      expect(userSelect).not.toHaveProperty('email');
      expect(userSelect).not.toHaveProperty('phone');
      expect(userSelect).not.toHaveProperty('passwordHash');
      expect(userSelect).not.toHaveProperty('id');
      expect(userSelect).not.toHaveProperty('roleId');
      expect(userSelect).not.toHaveProperty('isVerified');
      expect(userSelect).not.toHaveProperty('isBlocked');
      expect(userSelect).not.toHaveProperty('isActive');

      const historySelect = findManyArg.select.statusHistory.select;
      expect(historySelect).toEqual({
        reasonCode: true,
        createdAt: true,
      });
      expect(historySelect).not.toHaveProperty('changedByUserId');
      expect(historySelect).not.toHaveProperty('metadata');
      expect(historySelect).not.toHaveProperty('reasonNote');

      const jobSelect = mockPrisma.jobPost.findUnique.mock.calls[0][0].select;
      expect(jobSelect).not.toHaveProperty('adminNotes');
      expect(jobSelect).not.toHaveProperty('adminReviewStatus');

      expect(result).not.toBeNull();
      expect(result?.job).toEqual({
        id: 'job-post-uuid-1',
        title: 'Event Setup Crew',
        status: JobStatus.OPEN,
        workersNeeded: 3,
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 28.5,
        acceptedCount: 1,
      });
      expect(result?.summary).toEqual({
        total: 4,
        pending: 2,
        shortlisted: 1,
        accepted: 1,
        rejected: 0,
        withdrawn: 0,
      });
      expect(result?.total).toBe(1);
      expect(result?.page).toBe(1);
      expect(result?.limit).toBe(10);

      const item = result!.items[0];
      expect(item).toEqual({
        id: 'app-uuid-1',
        jobPostId: 'job-post-uuid-1',
        status: JobApplicationStatus.PENDING,
        expectedPay: 30,
        availableDate: new Date('2026-12-15T00:00:00.000Z'),
        appliedAt: new Date('2026-11-11T10:00:00.000Z'),
        updatedAt: new Date('2026-11-11T12:00:00.000Z'),
        worker: {
          id: 'worker-profile-uuid-1',
          firstName: 'Jane',
          lastName: 'Doe',
          location: 'Austin, TX',
          bio: 'Reliable event and staging specialist.',
          headline: 'Experienced Stage Technician',
          yearsExperience: 4,
          responseTimeHours: 2,
          availabilityStatus: 'available',
          isOpenToWork: true,
          totalCompletedGigs: 14,
          hasAvatar: true,
          skills: [
            { id: 'skill-uuid-1', name: 'Audio Setup', skillType: 'CORE' },
            { id: 'skill-uuid-2', name: 'Lighting', skillType: 'ADDITIONAL' },
          ],
        },
        historySummary: {
          lastChangedAt: new Date('2026-11-11T10:00:00.000Z'),
          latestReasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
          transitionCount: 1,
        },
      });

      // Ensure no S3 key or private fields leak onto returned objects
      expect(item.worker).not.toHaveProperty('avatarUrl');
      expect(item.worker).not.toHaveProperty('userId');
      expect(item.worker).not.toHaveProperty('email');
      expect(item.worker).not.toHaveProperty('phone');
      expect(item.worker).not.toHaveProperty('passwordHash');
      expect(item.worker).not.toHaveProperty('isBlocked');
      expect(item.worker).not.toHaveProperty('isActive');
      expect(item.historySummary).not.toHaveProperty('changedByUserId');
      expect(item.historySummary).not.toHaveProperty('metadata');
      expect(item.historySummary).not.toHaveProperty('reasonNote');
      expect(result?.job).not.toHaveProperty('adminNotes');
      expect(result?.job).not.toHaveProperty('adminReviewStatus');
    });

    it('applies pagination bounds and enforces max limit of 50', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(mockJobSelectResult);
      mockPrisma.jobApplication.count.mockResolvedValue(120);
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      mockPrisma.jobApplication.groupBy.mockResolvedValue([]);

      const customResult = await repository.findByJobPostId({
        jobPostId: 'job-post-uuid-1',
        page: 3,
        limit: 15,
      });

      expect(mockPrisma.jobApplication.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 30, take: 15 }),
      );
      expect(customResult?.page).toBe(3);
      expect(customResult?.limit).toBe(15);
      expect(customResult?.total).toBe(120);

      const clampedResult = await repository.findByJobPostId({
        jobPostId: 'job-post-uuid-1',
        page: -2,
        limit: 200,
      });

      expect(mockPrisma.jobApplication.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
      expect(clampedResult?.page).toBe(1);
      expect(clampedResult?.limit).toBe(50);
    });

    it.each([
      JobApplicationStatus.PENDING,
      JobApplicationStatus.SHORTLISTED,
      JobApplicationStatus.ACCEPTED,
      JobApplicationStatus.REJECTED,
      JobApplicationStatus.WITHDRAWN,
    ])(
      'filters by status "%s" while keeping per-status summary counts across ALL applications',
      async (status) => {
        mockPrisma.jobPost.findUnique.mockResolvedValue(mockJobSelectResult);
        mockPrisma.jobApplication.count.mockResolvedValue(2);
        mockPrisma.jobApplication.findMany.mockResolvedValue([]);
        mockPrisma.jobApplication.groupBy.mockResolvedValue([
          { status: JobApplicationStatus.PENDING, _count: { _all: 5 } },
          { status: JobApplicationStatus.SHORTLISTED, _count: { _all: 3 } },
          { status: JobApplicationStatus.ACCEPTED, _count: { _all: 2 } },
          { status: JobApplicationStatus.REJECTED, _count: { _all: 4 } },
          { status: JobApplicationStatus.WITHDRAWN, _count: { _all: 1 } },
        ]);

        const result = await repository.findByJobPostId({
          jobPostId: 'job-post-uuid-1',
          status,
        });

        expect(mockPrisma.jobApplication.count).toHaveBeenCalledWith({
          where: {
            jobPostId: 'job-post-uuid-1',
            status,
          },
        });
        expect(mockPrisma.jobApplication.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              jobPostId: 'job-post-uuid-1',
              status,
            },
          }),
        );
        // GroupBy remains scoped solely to jobPostId regardless of selected status filter
        expect(mockPrisma.jobApplication.groupBy).toHaveBeenCalledWith({
          by: ['status'],
          where: { jobPostId: 'job-post-uuid-1' },
          _count: { _all: true },
        });

        expect(result?.summary).toEqual({
          total: 15,
          pending: 5,
          shortlisted: 3,
          accepted: 2,
          rejected: 4,
          withdrawn: 1,
        });
        expect(result?.job.acceptedCount).toBe(2);
      },
    );

    it.each([
      {
        sortBy: JobApplicationSortBy.RECENT,
        expectedOrderBy: [{ appliedAt: 'desc' }, { id: 'desc' }],
      },
      {
        sortBy: JobApplicationSortBy.OLDEST,
        expectedOrderBy: [{ appliedAt: 'asc' }, { id: 'asc' }],
      },
      {
        sortBy: JobApplicationSortBy.EXPECTED_PAY_ASC,
        expectedOrderBy: [
          { expectedPay: { sort: 'asc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ],
      },
      {
        sortBy: JobApplicationSortBy.EXPECTED_PAY_DESC,
        expectedOrderBy: [
          { expectedPay: { sort: 'desc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ],
      },
      {
        sortBy: JobApplicationSortBy.AVAILABLE_DATE_ASC,
        expectedOrderBy: [
          { availableDate: { sort: 'asc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ],
      },
    ])(
      'applies sorting mode "$sortBy"',
      async ({ sortBy, expectedOrderBy }) => {
        mockPrisma.jobPost.findUnique.mockResolvedValue(mockJobSelectResult);
        mockPrisma.jobApplication.count.mockResolvedValue(0);
        mockPrisma.jobApplication.findMany.mockResolvedValue([]);
        mockPrisma.jobApplication.groupBy.mockResolvedValue([]);

        await repository.findByJobPostId({
          jobPostId: 'job-post-uuid-1',
          sortBy,
        });

        expect(mockPrisma.jobApplication.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: expectedOrderBy,
          }),
        );
      },
    );

    it('applies single-token and multi-token search across firstName, lastName, and headline without affecting job summary counts', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(mockJobSelectResult);
      mockPrisma.jobApplication.count.mockResolvedValue(1);
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      mockPrisma.jobApplication.groupBy.mockResolvedValue(defaultGroupByRows);

      await repository.findByJobPostId({
        jobPostId: 'job-post-uuid-1',
        search: '  carpenter  ',
      });

      expect(mockPrisma.jobApplication.count).toHaveBeenLastCalledWith({
        where: {
          jobPostId: 'job-post-uuid-1',
          OR: [
            {
              worker: {
                user: {
                  firstName: { contains: 'carpenter', mode: 'insensitive' },
                },
              },
            },
            {
              worker: {
                user: {
                  lastName: { contains: 'carpenter', mode: 'insensitive' },
                },
              },
            },
            {
              worker: {
                headline: { contains: 'carpenter', mode: 'insensitive' },
              },
            },
          ],
        },
      });

      await repository.findByJobPostId({
        jobPostId: 'job-post-uuid-1',
        search: 'Jane Doe',
      });

      expect(mockPrisma.jobApplication.count).toHaveBeenLastCalledWith({
        where: {
          jobPostId: 'job-post-uuid-1',
          OR: [
            {
              worker: {
                user: {
                  firstName: { contains: 'Jane Doe', mode: 'insensitive' },
                },
              },
            },
            {
              worker: {
                user: {
                  lastName: { contains: 'Jane Doe', mode: 'insensitive' },
                },
              },
            },
            {
              worker: {
                headline: { contains: 'Jane Doe', mode: 'insensitive' },
              },
            },
            {
              AND: [
                {
                  worker: {
                    OR: [
                      {
                        user: {
                          firstName: { contains: 'Jane', mode: 'insensitive' },
                        },
                      },
                      {
                        user: {
                          lastName: { contains: 'Jane', mode: 'insensitive' },
                        },
                      },
                    ],
                  },
                },
                {
                  worker: {
                    OR: [
                      {
                        user: {
                          firstName: { contains: 'Doe', mode: 'insensitive' },
                        },
                      },
                      {
                        user: {
                          lastName: { contains: 'Doe', mode: 'insensitive' },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      });

      expect(mockPrisma.jobApplication.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { jobPostId: 'job-post-uuid-1' },
        _count: { _all: true },
      });
    });

    it('handles missing/null optional profile fields, blank avatar keys, fixed-budget job fields, and empty history safely', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue({
        id: 'job-post-fixed-1',
        title: 'Fixed Gig',
        status: JobStatus.PAUSED,
        workersNeeded: 1,
        workType: WorkType.REMOTE,
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: new Prisma.Decimal('750.00'),
        hourlyRateMin: null,
        hourlyRateMax: new Prisma.Decimal('40.00'),
      });
      mockPrisma.jobApplication.count.mockResolvedValue(1);
      mockPrisma.jobApplication.findMany.mockResolvedValue([
        {
          id: 'app-uuid-minimal',
          jobPostId: 'job-post-fixed-1',
          status: JobApplicationStatus.SHORTLISTED,
          expectedPay: null,
          availableDate: null,
          appliedAt: new Date('2026-11-10T08:00:00.000Z'),
          updatedAt: new Date('2026-11-11T09:00:00.000Z'),
          worker: {
            id: 'worker-profile-uuid-2',
            headline: null,
            yearsExperience: null,
            responseTimeHours: null,
            availabilityStatus: 'busy',
            isOpenToWork: false,
            totalCompletedGigs: 0,
            user: {
              firstName: 'Alex',
              lastName: 'Smith',
              location: null,
              bio: null,
              avatarUrl: '   ',
            },
            skills: [],
          },
          statusHistory: [],
          _count: {
            statusHistory: 0,
          },
        },
      ]);
      mockPrisma.jobApplication.groupBy.mockResolvedValue([
        { status: JobApplicationStatus.SHORTLISTED, _count: { _all: 1 } },
      ]);

      const result = await repository.findByJobPostId({
        jobPostId: 'job-post-fixed-1',
      });

      expect(result?.job).toEqual({
        id: 'job-post-fixed-1',
        title: 'Fixed Gig',
        status: JobStatus.PAUSED,
        workersNeeded: 1,
        workType: WorkType.REMOTE,
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 750,
        hourlyRate: 40,
        acceptedCount: 0,
      });
      expect(result?.items[0]).toEqual({
        id: 'app-uuid-minimal',
        jobPostId: 'job-post-fixed-1',
        status: JobApplicationStatus.SHORTLISTED,
        expectedPay: null,
        availableDate: null,
        appliedAt: new Date('2026-11-10T08:00:00.000Z'),
        updatedAt: new Date('2026-11-11T09:00:00.000Z'),
        worker: {
          id: 'worker-profile-uuid-2',
          firstName: 'Alex',
          lastName: 'Smith',
          location: null,
          bio: null,
          headline: null,
          yearsExperience: null,
          responseTimeHours: null,
          availabilityStatus: 'busy',
          isOpenToWork: false,
          totalCompletedGigs: 0,
          hasAvatar: false,
          skills: [],
        },
        historySummary: null,
      });
    });
  });

  describe('shortlistApplication', () => {
    it('locks job and application rows, transitions pending to shortlisted, and appends history', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 2,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);
      mockTx.jobApplication.update.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.SHORTLISTED,
      });

      const result = await repository.shortlistApplication({
        jobPostId: 'job-post-uuid-1',
        applicationId: 'app-uuid-1',
        recruiterId: 'recruiter-uuid-1',
        changedByUserId: 'recruiter-user-1',
        reasonNote: '  Strong candidate  ',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(mockTx.jobApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-uuid-1' },
        data: { status: JobApplicationStatus.SHORTLISTED },
      });
      expect(mockTx.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-uuid-1',
          fromStatus: JobApplicationStatus.PENDING,
          toStatus: JobApplicationStatus.SHORTLISTED,
          reasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
          reasonNote: 'Strong candidate',
          changedByUserId: 'recruiter-user-1',
        },
      });
      expect(result.previousStatus).toBe(JobApplicationStatus.PENDING);
      expect(result.application.status).toBe(JobApplicationStatus.SHORTLISTED);
      expect(result.jobStatus).toBe(JobStatus.OPEN);
    });

    it('throws ApplicationConflictError when job is filled or application transition is invalid', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.FILLED,
            workersNeeded: 1,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);

      await expect(
        repository.shortlistApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          recruiterId: 'recruiter-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);

      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.PAUSED,
            workersNeeded: 1,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.SHORTLISTED,
      });

      await expect(
        repository.shortlistApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          recruiterId: 'recruiter-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);
    });

    it('throws ApplicationAuthorizationError when recruiter does not own job', async () => {
      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: 'job-post-uuid-1',
          recruiterId: 'owner-recruiter-1',
          status: JobStatus.OPEN,
          workersNeeded: 1,
        },
      ]);

      await expect(
        repository.shortlistApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          recruiterId: 'different-recruiter-2',
          changedByUserId: 'recruiter-user-2',
        }),
      ).rejects.toThrow(ApplicationAuthorizationError);
    });
  });

  describe('rejectApplication', () => {
    it('rejects shortlisted application on paused job and records recruiter_rejected history', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.PAUSED,
            workersNeeded: 1,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.SHORTLISTED,
      });
      mockTx.jobApplication.update.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.REJECTED,
      });

      const result = await repository.rejectApplication({
        jobPostId: 'job-post-uuid-1',
        applicationId: 'app-uuid-1',
        recruiterId: 'recruiter-uuid-1',
        changedByUserId: 'recruiter-user-1',
        reasonNote: 'Position requirements shifted',
      });

      expect(result.previousStatus).toBe(JobApplicationStatus.SHORTLISTED);
      expect(result.application.status).toBe(JobApplicationStatus.REJECTED);
      expect(mockTx.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-uuid-1',
          fromStatus: JobApplicationStatus.SHORTLISTED,
          toStatus: JobApplicationStatus.REJECTED,
          reasonCode: JobApplicationReasonCode.RECRUITER_REJECTED,
          reasonNote: 'Position requirements shifted',
          changedByUserId: 'recruiter-user-1',
        },
      });
    });

    it('throws ApplicationValidationError when required identifiers are blank', async () => {
      await expect(
        repository.rejectApplication({
          jobPostId: '  ',
          applicationId: 'app-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationValidationError);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('acceptApplication', () => {
    it('accepts an application without filling the job when remaining capacity exists', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 3,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);
      mockTx.jobApplication.count.mockResolvedValue(1);
      mockTx.jobApplication.update.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.ACCEPTED,
      });

      const result = await repository.acceptApplication({
        jobPostId: 'job-post-uuid-1',
        applicationId: 'app-uuid-1',
        recruiterId: 'recruiter-uuid-1',
        changedByUserId: 'recruiter-user-1',
      });

      expect(result).toMatchObject({
        previousStatus: JobApplicationStatus.PENDING,
        jobStatus: JobStatus.OPEN,
        workersNeeded: 3,
        acceptedCount: 2,
        jobFilled: false,
        autoRejectedCount: 0,
        autoRejectedApplicationIds: [],
      });
      expect(mockTx.jobPost.update).not.toHaveBeenCalled();
      expect(mockTx.jobApplication.updateMany).not.toHaveBeenCalled();
      expect(mockTx.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-uuid-1',
          fromStatus: JobApplicationStatus.PENDING,
          toStatus: JobApplicationStatus.ACCEPTED,
          reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
          reasonNote: null,
          changedByUserId: 'recruiter-user-1',
        },
      });
    });

    it('marks job FILLED and auto-rejects remaining pending and shortlisted applicants preserving fromStatus', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 2,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }])
        .mockResolvedValueOnce([
          { id: 'app-uuid-pending', status: JobApplicationStatus.PENDING },
          {
            id: 'app-uuid-shortlisted',
            status: JobApplicationStatus.SHORTLISTED,
          },
        ]);
      mockTx.jobApplication.findUnique.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.SHORTLISTED,
      });
      mockTx.jobApplication.count.mockResolvedValue(1);
      mockTx.jobApplication.update.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.ACCEPTED,
      });

      const result = await repository.acceptApplication({
        jobPostId: 'job-post-uuid-1',
        applicationId: 'app-uuid-1',
        recruiterId: 'recruiter-uuid-1',
        changedByUserId: 'recruiter-user-1',
      });

      expect(result).toMatchObject({
        previousStatus: JobApplicationStatus.SHORTLISTED,
        jobStatus: JobStatus.FILLED,
        workersNeeded: 2,
        acceptedCount: 2,
        jobFilled: true,
        autoRejectedCount: 2,
        autoRejectedApplicationIds: [
          'app-uuid-pending',
          'app-uuid-shortlisted',
        ],
      });
      expect(mockTx.jobPost.update).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
        data: { status: JobStatus.FILLED },
      });
      expect(mockTx.jobApplication.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['app-uuid-pending', 'app-uuid-shortlisted'] },
          jobPostId: 'job-post-uuid-1',
          status: {
            in: [
              JobApplicationStatus.PENDING,
              JobApplicationStatus.SHORTLISTED,
            ],
          },
        },
        data: { status: JobApplicationStatus.REJECTED },
      });
      expect(
        mockTx.jobApplicationStatusHistory.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            applicationId: 'app-uuid-pending',
            fromStatus: JobApplicationStatus.PENDING,
            toStatus: JobApplicationStatus.REJECTED,
            reasonCode: JobApplicationReasonCode.JOB_FILLED,
            reasonNote: null,
            changedByUserId: null,
            metadata: { triggeredByApplicationId: 'app-uuid-1' },
          },
          {
            applicationId: 'app-uuid-shortlisted',
            fromStatus: JobApplicationStatus.SHORTLISTED,
            toStatus: JobApplicationStatus.REJECTED,
            reasonCode: JobApplicationReasonCode.JOB_FILLED,
            reasonNote: null,
            changedByUserId: null,
            metadata: { triggeredByApplicationId: 'app-uuid-1' },
          },
        ],
      });
    });

    it('rejects acceptance when capacity is already reached or job is paused', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 1,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);
      mockTx.jobApplication.count.mockResolvedValue(1);

      await expect(
        repository.acceptApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);
      expect(mockTx.jobApplication.update).not.toHaveBeenCalled();

      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.PAUSED,
            workersNeeded: 2,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);

      await expect(
        repository.acceptApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationConflictError);
    });

    it('throws ApplicationNotFoundError when application belongs to another job', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 2,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-other' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue({
        ...mockDbApplication,
        id: 'app-uuid-other',
        jobPostId: 'other-job-uuid',
      });

      await expect(
        repository.acceptApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-other',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow(ApplicationNotFoundError);
    });

    it('propagates failure when history creation rejects inside the transaction', async () => {
      mockTx.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'job-post-uuid-1',
            recruiterId: 'recruiter-uuid-1',
            status: JobStatus.OPEN,
            workersNeeded: 1,
          },
        ])
        .mockResolvedValueOnce([{ id: 'app-uuid-1' }]);
      mockTx.jobApplication.findUnique.mockResolvedValue(mockDbApplication);
      mockTx.jobApplication.count.mockResolvedValue(0);
      mockTx.jobApplication.update.mockResolvedValue({
        ...mockDbApplication,
        status: JobApplicationStatus.ACCEPTED,
      });
      mockTx.jobApplicationStatusHistory.create.mockRejectedValueOnce(
        new Error('Simulated history failure'),
      );

      await expect(
        repository.acceptApplication({
          jobPostId: 'job-post-uuid-1',
          applicationId: 'app-uuid-1',
          changedByUserId: 'recruiter-user-1',
        }),
      ).rejects.toThrow('Simulated history failure');
    });
  });
});
