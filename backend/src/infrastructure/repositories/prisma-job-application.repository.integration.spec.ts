import { Test, TestingModule } from '@nestjs/testing';
import { JobCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaJobApplicationRepository } from './prisma-job-application.repository';
import { PrismaJobPostRepository } from './prisma-job-post.repository';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
} from '../../application/errors/application.errors';

describe('PrismaJobApplicationRepository Hiring Workflow (Integration)', () => {
  jest.setTimeout(30000);

  let prismaService: PrismaService;
  let repository: PrismaJobApplicationRepository;
  let jobPostRepository: PrismaJobPostRepository;
  let testCategory: JobCategory;
  let recruiterUserId: string;
  let recruiterProfileId: string;
  const workerProfileIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdJobPostIds: string[] = [];
  const createdApplicationIds: string[] = [];

  async function createTestWorker(index: number): Promise<string> {
    const role = await prismaService.appRole.findFirst({
      where: { code: 'WORKER' },
    });
    const fallbackRole = role ?? (await prismaService.appRole.findFirst());
    if (!fallbackRole) {
      throw new Error('Prerequisite setup failed: AppRole must exist');
    }

    const suffix = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
    const user = await prismaService.user.create({
      data: {
        email: `hiring-int-worker-${suffix}@example.com`,
        passwordHash: 'test-hash-not-for-login',
        roleId: fallbackRole.id,
        firstName: `Worker${index}`,
        lastName: 'Integration',
      },
    });
    createdUserIds.push(user.id);

    const profile = await prismaService.workerProfile.create({
      data: {
        userId: user.id,
      },
    });
    workerProfileIds.push(profile.id);
    return profile.id;
  }

  async function createTestJobPost(
    workersNeeded: number,
    status = JobStatus.OPEN,
  ) {
    const job = await prismaService.jobPost.create({
      data: {
        recruiterId: recruiterProfileId,
        categoryId: testCategory.id,
        title: `Hiring Integration Job ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: 'PostgreSQL atomic hiring persistence test job',
        workType: WorkType.REMOTE,
        workersNeeded,
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: new Prisma.Decimal('250.00'),
        status,
        adminReviewStatus: 'approved',
      },
    });
    createdJobPostIds.push(job.id);
    return job;
  }

  async function createTestApplication(
    jobPostId: string,
    workerId: string,
    status: JobApplicationStatus = JobApplicationStatus.PENDING,
  ) {
    const entity = await repository.create({
      jobPostId,
      workerId,
      status,
      reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
      changedByUserId: recruiterUserId,
    });
    createdApplicationIds.push(entity.id);
    return entity;
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        PrismaJobApplicationRepository,
        PrismaJobPostRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<PrismaJobApplicationRepository>(
      PrismaJobApplicationRepository,
    );
    jobPostRepository = moduleRef.get<PrismaJobPostRepository>(
      PrismaJobPostRepository,
    );
    await prismaService.onModuleInit();

    const recruiterRole =
      (await prismaService.appRole.findFirst({
        where: { code: 'RECRUITER' },
      })) ?? (await prismaService.appRole.findFirst());
    if (!recruiterRole) {
      throw new Error('Prerequisite setup failed: AppRole must exist');
    }

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const recruiterUser = await prismaService.user.create({
      data: {
        email: `hiring-int-recruiter-${suffix}@example.com`,
        passwordHash: 'test-hash-not-for-login',
        roleId: recruiterRole.id,
        firstName: 'Recruiter',
        lastName: 'Integration',
      },
    });
    createdUserIds.push(recruiterUser.id);
    recruiterUserId = recruiterUser.id;

    const recruiterProfile = await prismaService.recruiterProfile.create({
      data: {
        userId: recruiterUser.id,
      },
    });
    recruiterProfileId = recruiterProfile.id;

    testCategory = await prismaService.jobCategory.create({
      data: {
        name: `Hiring-Int-Cat-${suffix}`,
        description: 'Temporary category for atomic hiring integration tests',
      },
    });

    for (let i = 1; i <= 4; i++) {
      await createTestWorker(i);
    }
  });

  afterAll(async () => {
    try {
      if (createdApplicationIds.length > 0) {
        await prismaService.jobApplicationStatusHistory.deleteMany({
          where: { applicationId: { in: createdApplicationIds } },
        });
        await prismaService.jobApplication.deleteMany({
          where: { id: { in: createdApplicationIds } },
        });
      }

      if (createdJobPostIds.length > 0) {
        await prismaService.jobPost.deleteMany({
          where: { id: { in: createdJobPostIds } },
        });
      }

      if (testCategory) {
        await prismaService.jobCategory.deleteMany({
          where: { id: testCategory.id },
        });
      }

      if (workerProfileIds.length > 0) {
        await prismaService.workerProfile.deleteMany({
          where: { id: { in: workerProfileIds } },
        });
      }

      if (recruiterProfileId) {
        await prismaService.recruiterProfile.deleteMany({
          where: { id: recruiterProfileId },
        });
      }

      if (createdUserIds.length > 0) {
        await prismaService.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } finally {
      await prismaService.$disconnect();
    }
  });

  it('shortlists and rejects applicants atomically with accurate audit history', async () => {
    const job = await createTestJobPost(2);
    const appA = await createTestApplication(job.id, workerProfileIds[0]);
    const appB = await createTestApplication(job.id, workerProfileIds[1]);

    const shortlisted = await repository.shortlistApplication({
      jobPostId: job.id,
      applicationId: appA.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
      reasonNote: 'Strong portfolio match',
    });

    expect(shortlisted.previousStatus).toBe(JobApplicationStatus.PENDING);
    expect(shortlisted.application.status).toBe(
      JobApplicationStatus.SHORTLISTED,
    );

    const rejected = await repository.rejectApplication({
      jobPostId: job.id,
      applicationId: appB.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
      reasonNote: 'Rate mismatch',
    });

    expect(rejected.previousStatus).toBe(JobApplicationStatus.PENDING);
    expect(rejected.application.status).toBe(JobApplicationStatus.REJECTED);

    const historyA = await prismaService.jobApplicationStatusHistory.findMany({
      where: { applicationId: appA.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(historyA).toHaveLength(2);
    expect(historyA[1]).toMatchObject({
      applicationId: appA.id,
      fromStatus: JobApplicationStatus.PENDING,
      toStatus: JobApplicationStatus.SHORTLISTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
      reasonNote: 'Strong portfolio match',
      changedByUserId: recruiterUserId,
    });

    const historyB = await prismaService.jobApplicationStatusHistory.findMany({
      where: { applicationId: appB.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(historyB).toHaveLength(2);
    expect(historyB[1]).toMatchObject({
      applicationId: appB.id,
      fromStatus: JobApplicationStatus.PENDING,
      toStatus: JobApplicationStatus.REJECTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_REJECTED,
      reasonNote: 'Rate mismatch',
      changedByUserId: recruiterUserId,
    });
  });

  it('accepts an applicant without filling the job when capacity remains, then fills and auto-rejects pending and shortlisted applicants on final hire', async () => {
    const job = await createTestJobPost(2);
    const appAccept1 = await createTestApplication(job.id, workerProfileIds[0]);
    const appAccept2 = await createTestApplication(job.id, workerProfileIds[1]);
    const appPending = await createTestApplication(job.id, workerProfileIds[2]);
    const appShortlisted = await createTestApplication(
      job.id,
      workerProfileIds[3],
    );

    await repository.shortlistApplication({
      jobPostId: job.id,
      applicationId: appShortlisted.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    // First accept: 1 of 2 seats filled -> job stays OPEN, zero auto-rejections
    const firstAccept = await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: appAccept1.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    expect(firstAccept).toMatchObject({
      previousStatus: JobApplicationStatus.PENDING,
      jobStatus: JobStatus.OPEN,
      workersNeeded: 2,
      acceptedCount: 1,
      jobFilled: false,
      autoRejectedCount: 0,
      autoRejectedApplicationIds: [],
    });

    const midJob = await prismaService.jobPost.findUnique({
      where: { id: job.id },
    });
    expect(midJob?.status).toBe(JobStatus.OPEN);

    const midPending = await prismaService.jobApplication.findUnique({
      where: { id: appPending.id },
    });
    const midShortlisted = await prismaService.jobApplication.findUnique({
      where: { id: appShortlisted.id },
    });
    expect(midPending?.status).toBe(JobApplicationStatus.PENDING);
    expect(midShortlisted?.status).toBe(JobApplicationStatus.SHORTLISTED);

    // Second accept: 2 of 2 seats filled -> job becomes FILLED, remaining pending & shortlisted auto-rejected
    const secondAccept = await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: appAccept2.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
      reasonNote: 'Welcome aboard',
    });

    expect(secondAccept.previousStatus).toBe(JobApplicationStatus.PENDING);
    expect(secondAccept.jobStatus).toBe(JobStatus.FILLED);
    expect(secondAccept.acceptedCount).toBe(2);
    expect(secondAccept.jobFilled).toBe(true);
    expect(secondAccept.autoRejectedCount).toBe(2);
    expect(new Set(secondAccept.autoRejectedApplicationIds)).toEqual(
      new Set([appPending.id, appShortlisted.id]),
    );

    const filledJob = await prismaService.jobPost.findUnique({
      where: { id: job.id },
    });
    expect(filledJob?.status).toBe(JobStatus.FILLED);

    const [dbPending, dbShortlisted] = await Promise.all([
      prismaService.jobApplication.findUnique({ where: { id: appPending.id } }),
      prismaService.jobApplication.findUnique({
        where: { id: appShortlisted.id },
      }),
    ]);
    expect(dbPending?.status).toBe(JobApplicationStatus.REJECTED);
    expect(dbShortlisted?.status).toBe(JobApplicationStatus.REJECTED);

    const [acceptHistory2, pendingHistory, shortlistedHistory] =
      await Promise.all([
        prismaService.jobApplicationStatusHistory.findMany({
          where: { applicationId: appAccept2.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
        prismaService.jobApplicationStatusHistory.findMany({
          where: { applicationId: appPending.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
        prismaService.jobApplicationStatusHistory.findMany({
          where: { applicationId: appShortlisted.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      ]);

    expect(acceptHistory2[acceptHistory2.length - 1]).toMatchObject({
      fromStatus: JobApplicationStatus.PENDING,
      toStatus: JobApplicationStatus.ACCEPTED,
      reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
      reasonNote: 'Welcome aboard',
      changedByUserId: recruiterUserId,
    });

    expect(pendingHistory[pendingHistory.length - 1]).toMatchObject({
      fromStatus: JobApplicationStatus.PENDING,
      toStatus: JobApplicationStatus.REJECTED,
      reasonCode: JobApplicationReasonCode.JOB_FILLED,
      changedByUserId: null,
    });

    expect(shortlistedHistory[shortlistedHistory.length - 1]).toMatchObject({
      fromStatus: JobApplicationStatus.SHORTLISTED,
      toStatus: JobApplicationStatus.REJECTED,
      reasonCode: JobApplicationReasonCode.JOB_FILLED,
      changedByUserId: null,
    });
  });

  it('rolls back application update, job fill, and auto-rejections if history insertion fails', async () => {
    const job = await createTestJobPost(1);
    const app1 = await createTestApplication(job.id, workerProfileIds[0]);
    const app2 = await createTestApplication(job.id, workerProfileIds[1]);

    const nonExistentUserId = 'b0000000-0000-4000-8000-000000000000';

    let caughtError: unknown;
    try {
      await repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app1.id,
        recruiterId: recruiterProfileId,
        changedByUserId: nonExistentUserId,
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((caughtError as Prisma.PrismaClientKnownRequestError).code).toBe(
      'P2003',
    );

    const [dbJob, dbApp1, dbApp2, app1History, app2History] = await Promise.all(
      [
        prismaService.jobPost.findUnique({ where: { id: job.id } }),
        prismaService.jobApplication.findUnique({ where: { id: app1.id } }),
        prismaService.jobApplication.findUnique({ where: { id: app2.id } }),
        prismaService.jobApplicationStatusHistory.findMany({
          where: { applicationId: app1.id },
        }),
        prismaService.jobApplicationStatusHistory.findMany({
          where: { applicationId: app2.id },
        }),
      ],
    );

    expect(dbJob?.status).toBe(JobStatus.OPEN);
    expect(dbApp1?.status).toBe(JobApplicationStatus.PENDING);
    expect(dbApp2?.status).toBe(JobApplicationStatus.PENDING);
    expect(app1History).toHaveLength(1);
    expect(app2History).toHaveLength(1);
  });

  it('enforces workersNeeded=1 under concurrent acceptApplication calls and auto-rejects losers', async () => {
    const job = await createTestJobPost(1);
    const app1 = await createTestApplication(job.id, workerProfileIds[0]);
    const app2 = await createTestApplication(job.id, workerProfileIds[1]);
    const app3 = await createTestApplication(job.id, workerProfileIds[2]);

    await repository.shortlistApplication({
      jobPostId: job.id,
      applicationId: app2.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    const settled = await Promise.allSettled([
      repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app1.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
      repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app2.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
      repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app3.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
    ]);

    const fulfilled = settled.filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof repository.acceptApplication>>
      > => r.status === 'fulfilled',
    );
    const rejected = settled.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(ApplicationConflictError);
    }

    expect(fulfilled[0].value.jobFilled).toBe(true);
    expect(fulfilled[0].value.acceptedCount).toBe(1);
    expect(fulfilled[0].value.autoRejectedCount).toBe(2);

    const dbApps = await prismaService.jobApplication.findMany({
      where: { jobPostId: job.id },
    });
    const acceptedApps = dbApps.filter(
      (a) =>
        (a.status as JobApplicationStatus) === JobApplicationStatus.ACCEPTED,
    );
    const rejectedApps = dbApps.filter(
      (a) =>
        (a.status as JobApplicationStatus) === JobApplicationStatus.REJECTED,
    );

    expect(acceptedApps).toHaveLength(1);
    expect(rejectedApps).toHaveLength(2);

    const dbJob = await prismaService.jobPost.findUnique({
      where: { id: job.id },
    });
    expect(dbJob?.status).toBe(JobStatus.FILLED);
  });

  it('never exceeds workersNeeded=2 under 4 concurrent acceptApplication calls', async () => {
    const job = await createTestJobPost(2);
    const apps = await Promise.all([
      createTestApplication(job.id, workerProfileIds[0]),
      createTestApplication(job.id, workerProfileIds[1]),
      createTestApplication(job.id, workerProfileIds[2]),
      createTestApplication(job.id, workerProfileIds[3]),
    ]);

    await repository.shortlistApplication({
      jobPostId: job.id,
      applicationId: apps[3].id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    const settled = await Promise.allSettled(
      apps.map((app) =>
        repository.acceptApplication({
          jobPostId: job.id,
          applicationId: app.id,
          recruiterId: recruiterProfileId,
          changedByUserId: recruiterUserId,
        }),
      ),
    );

    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(2);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(ApplicationConflictError);
    }

    const dbApps = await prismaService.jobApplication.findMany({
      where: { jobPostId: job.id },
    });
    const acceptedCount = dbApps.filter(
      (a) =>
        (a.status as JobApplicationStatus) === JobApplicationStatus.ACCEPTED,
    ).length;
    const rejectedApps = dbApps.filter(
      (a) =>
        (a.status as JobApplicationStatus) === JobApplicationStatus.REJECTED,
    );

    expect(acceptedCount).toBe(2);
    expect(rejectedApps).toHaveLength(2);

    const dbJob = await prismaService.jobPost.findUnique({
      where: { id: job.id },
    });
    expect(dbJob?.status).toBe(JobStatus.FILLED);

    // Every auto-rejected application must have a system-generated JOB_FILLED history entry
    for (const loser of rejectedApps) {
      const history = await prismaService.jobApplicationStatusHistory.findMany({
        where: {
          applicationId: loser.id,
          reasonCode: JobApplicationReasonCode.JOB_FILLED,
        },
      });
      expect(history).toHaveLength(1);
      expect(history[0].changedByUserId).toBeNull();
      expect(history[0].toStatus).toBe(JobApplicationStatus.REJECTED);
    }
  });

  it('rejects cross-job application references and unauthorized recruiter access inside the transaction', async () => {
    const job1 = await createTestJobPost(1);
    const job2 = await createTestJobPost(1);
    const appOnJob2 = await createTestApplication(job2.id, workerProfileIds[0]);

    await expect(
      repository.acceptApplication({
        jobPostId: job1.id,
        applicationId: appOnJob2.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
    ).rejects.toThrow(ApplicationNotFoundError);

    await expect(
      repository.shortlistApplication({
        jobPostId: job2.id,
        applicationId: appOnJob2.id,
        recruiterId: 'other-recruiter-profile-id',
        changedByUserId: recruiterUserId,
      }),
    ).rejects.toThrow(ApplicationAuthorizationError);
  });

  it('allows valid workersNeeded reductions (>= acceptedCount) and rejects invalid ones (< acceptedCount) against live PostgreSQL', async () => {
    const job = await createTestJobPost(3);
    const app1 = await createTestApplication(job.id, workerProfileIds[0]);
    await createTestApplication(job.id, workerProfileIds[1]);

    await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: app1.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    // Valid reduction: 3 -> 2 (still >= 1 accepted)
    const reducedToTwo = await jobPostRepository.updateWithSkills(
      job.id,
      { workersNeeded: 2 },
      [],
    );
    expect(reducedToTwo.workersNeeded).toBe(2);

    // Valid reduction: 2 -> 1 (equal to 1 accepted)
    const reducedToOne = await jobPostRepository.updateWithSkills(
      job.id,
      { workersNeeded: 1 },
      [],
    );
    expect(reducedToOne.workersNeeded).toBe(1);

    // Increasing back to 2 works, then accepting 2nd applicant and trying 2 -> 1 fails
    await jobPostRepository.updateWithSkills(job.id, { workersNeeded: 3 }, []);
    const app2 = await prismaService.jobApplication.findFirstOrThrow({
      where: { jobPostId: job.id, workerId: workerProfileIds[1] },
    });
    await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: app2.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    await expect(
      jobPostRepository.updateWithSkills(job.id, { workersNeeded: 1 }, []),
    ).rejects.toThrow(ApplicationConflictError);

    const dbJob = await prismaService.jobPost.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(dbJob.workersNeeded).toBe(3);
  });

  it('serializes acceptApplication and conflicting workersNeeded reduction (2 -> 1 with 1 accepted) so acceptedCount never exceeds workersNeeded', async () => {
    const job = await createTestJobPost(2);
    const app1 = await createTestApplication(job.id, workerProfileIds[0]);
    const app2 = await createTestApplication(job.id, workerProfileIds[1]);

    await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: app1.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    const settled = await Promise.allSettled([
      repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app2.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
      jobPostRepository.updateWithSkills(job.id, { workersNeeded: 1 }, []),
    ]);

    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ApplicationConflictError);

    const [dbJob, acceptedCount] = await Promise.all([
      prismaService.jobPost.findUniqueOrThrow({ where: { id: job.id } }),
      prismaService.jobApplication.count({
        where: {
          jobPostId: job.id,
          status: JobApplicationStatus.ACCEPTED,
        },
      }),
    ]);

    expect(acceptedCount).toBeLessThanOrEqual(dbJob.workersNeeded);
  });

  it('serializes acceptApplication and conflicting workersNeeded reduction on an open multi-seat job (3 -> 1 with 1 accepted) so acceptedCount never exceeds workersNeeded', async () => {
    const job = await createTestJobPost(3);
    const app1 = await createTestApplication(job.id, workerProfileIds[0]);
    const app2 = await createTestApplication(job.id, workerProfileIds[1]);

    await repository.acceptApplication({
      jobPostId: job.id,
      applicationId: app1.id,
      recruiterId: recruiterProfileId,
      changedByUserId: recruiterUserId,
    });

    const settled = await Promise.allSettled([
      repository.acceptApplication({
        jobPostId: job.id,
        applicationId: app2.id,
        recruiterId: recruiterProfileId,
        changedByUserId: recruiterUserId,
      }),
      jobPostRepository.updateWithSkills(job.id, { workersNeeded: 1 }, []),
    ]);

    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected = settled.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ApplicationConflictError);

    const [dbJob, acceptedCount] = await Promise.all([
      prismaService.jobPost.findUniqueOrThrow({ where: { id: job.id } }),
      prismaService.jobApplication.count({
        where: {
          jobPostId: job.id,
          status: JobApplicationStatus.ACCEPTED,
        },
      }),
    ]);

    expect(acceptedCount).toBeLessThanOrEqual(dbJob.workersNeeded);
    expect(dbJob.status).toBe(JobStatus.OPEN);
  });
});
