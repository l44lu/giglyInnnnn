import { Injectable } from '@nestjs/common';
import { Prisma, JobApplication } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaBaseRepository } from './base.repository';
import {
  AcceptJobApplicationResult,
  CreateJobApplicationData,
  FindJobApplicationsParams,
  FindJobApplicationsResult,
  IJobApplicationRepository,
  JobApplicationHistorySummaryReadModel,
  JobApplicationReadModel,
  JobApplicationSortBy,
  JobApplicationStatusCounts,
  TransitionJobApplicationParams,
  TransitionJobApplicationResult,
} from '../../domain/repositories/job-application.repository.interface';
import {
  InvalidJobApplicationTransitionError,
  JobApplicationEntity,
} from '../../domain/entities/job-application.entity';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../application/errors/application.errors';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const applicantRecordSelect = {
  id: true,
  jobPostId: true,
  status: true,
  expectedPay: true,
  availableDate: true,
  appliedAt: true,
  updatedAt: true,
  worker: {
    select: {
      id: true,
      headline: true,
      yearsExperience: true,
      responseTimeHours: true,
      availabilityStatus: true,
      isOpenToWork: true,
      totalCompletedGigs: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          location: true,
          bio: true,
          avatarUrl: true,
        },
      },
      skills: {
        select: {
          skillType: true,
          skill: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          skill: {
            name: 'asc' as const,
          },
        },
      },
    },
  },
  statusHistory: {
    select: {
      reasonCode: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
  },
  _count: {
    select: {
      statusHistory: true,
    },
  },
} satisfies Prisma.JobApplicationSelect;

type ApplicantPersistenceRecord = Prisma.JobApplicationGetPayload<{
  select: typeof applicantRecordSelect;
}>;

@Injectable()
export class PrismaJobApplicationRepository
  extends PrismaBaseRepository<JobApplicationEntity, JobApplication>
  implements IJobApplicationRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.jobApplication);
  }

  private toNullableNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }
    return Number(value);
  }

  private toNullableDecimal(
    value: Prisma.Decimal | number | null | undefined,
  ): Prisma.Decimal | null {
    if (value === undefined || value === null) return null;
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value);
  }

  protected mapToDomain(record: JobApplication): JobApplicationEntity {
    return new JobApplicationEntity({
      id: record.id,
      jobPostId: record.jobPostId,
      workerId: record.workerId,
      status: record.status as JobApplicationStatus,
      expectedPay: this.toNullableNumber(record.expectedPay),
      availableDate: record.availableDate
        ? new Date(record.availableDate)
        : null,
      appliedAt: record.appliedAt,
      updatedAt: record.updatedAt,
    });
  }

  override async create(
    data: CreateJobApplicationData,
  ): Promise<JobApplicationEntity> {
    const initialStatus = data.status ?? JobApplicationStatus.PENDING;
    const reasonCode =
      data.reasonCode ?? JobApplicationReasonCode.APPLICATION_SUBMITTED;

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const application = await tx.jobApplication.create({
          data: {
            jobPostId: data.jobPostId,
            workerId: data.workerId,
            status: initialStatus,
            expectedPay: this.toNullableDecimal(data.expectedPay),
            availableDate: data.availableDate
              ? new Date(data.availableDate)
              : null,
          },
        });

        await tx.jobApplicationStatusHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: null,
            toStatus: application.status,
            reasonCode,
            reasonNote: data.reasonNote ?? null,
            changedByUserId: data.changedByUserId ?? null,
            ...(data.metadata !== undefined &&
              data.metadata !== null && {
                metadata: data.metadata as Prisma.InputJsonValue,
              }),
          },
        });

        return application;
      });
      return this.mapToDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta?.target as string[] | string | undefined) ?? [];
        const targetStr = Array.isArray(target)
          ? target.join(',')
          : String(target);

        const isDuplicateApplication =
          targetStr.includes('JobApplication_jobPostId_workerId_key') ||
          (targetStr.includes('jobPostId') && targetStr.includes('workerId')) ||
          error.message.includes('JobApplication_jobPostId_workerId_key');

        if (isDuplicateApplication) {
          throw new ApplicationConflictError(
            'You have already applied for this job',
          );
        }
      }
      throw error;
    }
  }

  async findByJobAndWorker(
    jobPostId: string,
    workerId: string,
  ): Promise<JobApplicationEntity | null> {
    const record = await this.prisma.jobApplication.findUnique({
      where: {
        jobPostId_workerId: {
          jobPostId,
          workerId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  async findByJobPostId(
    params: FindJobApplicationsParams,
  ): Promise<FindJobApplicationsResult | null> {
    const trimmedJobPostId = params.jobPostId?.trim();
    if (!trimmedJobPostId) {
      throw new Error('jobPostId must be a non-empty string');
    }

    const jobRecord = await this.prisma.jobPost.findUnique({
      where: { id: trimmedJobPostId },
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

    if (!jobRecord) {
      return null;
    }

    const page = this.normalizePage(params.page);
    const limit = this.normalizeLimit(params.limit);
    const skip = (page - 1) * limit;
    const filteredWhere = this.buildFilteredWhere(trimmedJobPostId, params);
    const orderBy = this.buildOrderBy(params.sortBy);

    const [total, records, statusGroups] = await Promise.all([
      this.prisma.jobApplication.count({ where: filteredWhere }),
      this.prisma.jobApplication.findMany({
        where: filteredWhere,
        orderBy,
        skip,
        take: limit,
        select: applicantRecordSelect,
      }),
      this.prisma.jobApplication.groupBy({
        by: ['status'],
        where: { jobPostId: trimmedJobPostId },
        _count: { _all: true },
      }),
    ]);

    const summary = this.buildStatusSummary(statusGroups);
    const hourlyRate =
      this.toNullableNumber(jobRecord.hourlyRateMin) ??
      this.toNullableNumber(jobRecord.hourlyRateMax);

    return {
      job: {
        id: jobRecord.id,
        title: jobRecord.title,
        status: jobRecord.status as JobStatus,
        workersNeeded: jobRecord.workersNeeded,
        workType: jobRecord.workType as WorkType,
        paymentStructure: jobRecord.paymentStructure as PaymentStructure,
        budgetAmount: this.toNullableNumber(jobRecord.budgetAmount),
        hourlyRate,
        acceptedCount: summary.accepted,
      },
      items: records.map((record) => this.mapApplicantToReadModel(record)),
      total,
      page,
      limit,
      summary,
    };
  }

  async shortlistApplication(
    params: TransitionJobApplicationParams,
  ): Promise<TransitionJobApplicationResult> {
    return this.transitionNonAcceptStatus(
      params,
      JobApplicationStatus.SHORTLISTED,
    );
  }

  async rejectApplication(
    params: TransitionJobApplicationParams,
  ): Promise<TransitionJobApplicationResult> {
    return this.transitionNonAcceptStatus(
      params,
      JobApplicationStatus.REJECTED,
    );
  }

  async acceptApplication(
    params: TransitionJobApplicationParams,
  ): Promise<AcceptJobApplicationResult> {
    const validated = this.validateTransitionParams(params);

    return this.prisma.$transaction(async (tx) => {
      const { lockedJob, entity } = await this.lockJobAndApplication(
        tx,
        validated.jobPostId,
        validated.applicationId,
        validated.recruiterId,
      );

      if (lockedJob.status === JobStatus.FILLED) {
        throw new ApplicationConflictError(
          'Job has already reached its hiring capacity',
        );
      }

      if (lockedJob.status !== JobStatus.OPEN) {
        throw new ApplicationConflictError(
          `Cannot accept applications when job status is "${lockedJob.status}"`,
        );
      }

      const previousStatus = entity.status;
      this.applyDomainTransition(() => entity.accept());

      const currentAcceptedCount = await tx.jobApplication.count({
        where: {
          jobPostId: validated.jobPostId,
          status: JobApplicationStatus.ACCEPTED,
        },
      });

      if (
        !Number.isInteger(lockedJob.workersNeeded) ||
        lockedJob.workersNeeded < 1 ||
        currentAcceptedCount >= lockedJob.workersNeeded
      ) {
        throw new ApplicationConflictError(
          'Job has already reached its hiring capacity',
        );
      }

      const updatedRecord = await tx.jobApplication.update({
        where: { id: validated.applicationId },
        data: { status: entity.status },
      });

      await tx.jobApplicationStatusHistory.create({
        data: {
          applicationId: validated.applicationId,
          fromStatus: previousStatus,
          toStatus: JobApplicationStatus.ACCEPTED,
          reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
          reasonNote: validated.reasonNote,
          changedByUserId: validated.changedByUserId,
          ...(validated.metadata !== null && {
            metadata: validated.metadata as Prisma.InputJsonValue,
          }),
        },
      });

      const acceptedCount = currentAcceptedCount + 1;
      const jobFilled = acceptedCount >= lockedJob.workersNeeded;
      const autoRejectedApplicationIds = jobFilled
        ? await this.completeFilledJob(
            tx,
            validated.jobPostId,
            validated.applicationId,
          )
        : [];

      return {
        application: this.mapToDomain(updatedRecord),
        previousStatus,
        jobStatus: jobFilled ? JobStatus.FILLED : JobStatus.OPEN,
        workersNeeded: lockedJob.workersNeeded,
        acceptedCount,
        jobFilled,
        autoRejectedCount: autoRejectedApplicationIds.length,
        autoRejectedApplicationIds,
      };
    });
  }

  private async transitionNonAcceptStatus(
    params: TransitionJobApplicationParams,
    targetStatus:
      | JobApplicationStatus.SHORTLISTED
      | JobApplicationStatus.REJECTED,
  ): Promise<TransitionJobApplicationResult> {
    const validated = this.validateTransitionParams(params);
    const reasonCode =
      targetStatus === JobApplicationStatus.SHORTLISTED
        ? JobApplicationReasonCode.RECRUITER_SHORTLISTED
        : JobApplicationReasonCode.RECRUITER_REJECTED;

    return this.prisma.$transaction(async (tx) => {
      const { lockedJob, entity } = await this.lockJobAndApplication(
        tx,
        validated.jobPostId,
        validated.applicationId,
        validated.recruiterId,
      );

      if (
        lockedJob.status !== JobStatus.OPEN &&
        lockedJob.status !== JobStatus.PAUSED
      ) {
        throw new ApplicationConflictError(
          `Cannot update application status when job status is "${lockedJob.status}"`,
        );
      }

      const previousStatus = entity.status;
      this.applyDomainTransition(() => {
        if (targetStatus === JobApplicationStatus.SHORTLISTED) {
          entity.shortlist();
        } else {
          entity.reject();
        }
      });

      const updatedRecord = await tx.jobApplication.update({
        where: { id: validated.applicationId },
        data: { status: entity.status },
      });

      await tx.jobApplicationStatusHistory.create({
        data: {
          applicationId: validated.applicationId,
          fromStatus: previousStatus,
          toStatus: entity.status,
          reasonCode,
          reasonNote: validated.reasonNote,
          changedByUserId: validated.changedByUserId,
          ...(validated.metadata !== null && {
            metadata: validated.metadata as Prisma.InputJsonValue,
          }),
        },
      });

      return {
        application: this.mapToDomain(updatedRecord),
        previousStatus,
        jobStatus: lockedJob.status as JobStatus,
      };
    });
  }

  private validateTransitionParams(params: TransitionJobApplicationParams): {
    jobPostId: string;
    applicationId: string;
    recruiterId?: string;
    changedByUserId: string;
    reasonNote: string | null;
    metadata: Record<string, unknown> | null;
  } {
    const jobPostId = params.jobPostId?.trim();
    if (!jobPostId) {
      throw new ApplicationValidationError(
        'jobPostId must be a non-empty string',
      );
    }

    const applicationId = params.applicationId?.trim();
    if (!applicationId) {
      throw new ApplicationValidationError(
        'applicationId must be a non-empty string',
      );
    }

    const changedByUserId = params.changedByUserId?.trim();
    if (!changedByUserId) {
      throw new ApplicationValidationError(
        'changedByUserId must be a non-empty string',
      );
    }

    let recruiterId: string | undefined;
    if (params.recruiterId !== undefined) {
      recruiterId = params.recruiterId.trim();
      if (!recruiterId) {
        throw new ApplicationValidationError(
          'recruiterId must be a non-empty string',
        );
      }
    }

    let reasonNote: string | null = null;
    if (params.reasonNote !== undefined && params.reasonNote !== null) {
      if (typeof params.reasonNote !== 'string') {
        throw new ApplicationValidationError('reasonNote must be a string');
      }
      const trimmedNote = params.reasonNote.trim();
      reasonNote = trimmedNote.length > 0 ? trimmedNote : null;
    }

    let metadata: Record<string, unknown> | null = null;
    if (params.metadata !== undefined && params.metadata !== null) {
      if (
        typeof params.metadata !== 'object' ||
        Array.isArray(params.metadata)
      ) {
        throw new ApplicationValidationError('metadata must be a JSON object');
      }
      metadata = params.metadata;
    }

    return {
      jobPostId,
      applicationId,
      recruiterId,
      changedByUserId,
      reasonNote,
      metadata,
    };
  }

  private async lockJobAndApplication(
    tx: Prisma.TransactionClient,
    jobPostId: string,
    applicationId: string,
    recruiterId?: string,
  ): Promise<{
    lockedJob: {
      id: string;
      recruiterId: string;
      status: string;
      workersNeeded: number;
    };
    entity: JobApplicationEntity;
  }> {
    const lockedJobs = await tx.$queryRaw<
      Array<{
        id: string;
        recruiterId: string;
        status: string;
        workersNeeded: number;
      }>
    >`
      SELECT "id", "recruiterId", "status", "workersNeeded"
      FROM "JobPost"
      WHERE "id" = ${jobPostId}
      FOR UPDATE
    `;

    const lockedJob = lockedJobs[0];
    if (!lockedJob) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    if (recruiterId !== undefined && lockedJob.recruiterId !== recruiterId) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to manage applications for this job',
      );
    }

    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "JobApplication"
      WHERE "id" = ${applicationId}
      FOR UPDATE
    `;

    const applicationRecord = await tx.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!applicationRecord || applicationRecord.jobPostId !== jobPostId) {
      throw new ApplicationNotFoundError('Job application not found');
    }

    return {
      lockedJob,
      entity: this.mapToDomain(applicationRecord),
    };
  }

  private applyDomainTransition(entityAction: () => void): void {
    try {
      entityAction();
    } catch (error) {
      if (error instanceof InvalidJobApplicationTransitionError) {
        throw new ApplicationConflictError(error.message);
      }
      throw error;
    }
  }

  private async completeFilledJob(
    tx: Prisma.TransactionClient,
    jobPostId: string,
    acceptedApplicationId: string,
  ): Promise<string[]> {
    await tx.jobPost.update({
      where: { id: jobPostId },
      data: { status: JobStatus.FILLED },
    });

    const remainingEligible = await tx.$queryRaw<
      Array<{ id: string; status: string }>
    >`
      SELECT "id", "status"
      FROM "JobApplication"
      WHERE "jobPostId" = ${jobPostId}
        AND "id" <> ${acceptedApplicationId}
        AND "status" IN (${JobApplicationStatus.PENDING}, ${JobApplicationStatus.SHORTLISTED})
      ORDER BY "id" ASC
      FOR UPDATE
    `;

    if (remainingEligible.length === 0) {
      return [];
    }

    const autoRejectedIds = remainingEligible.map((item) => item.id);

    await tx.jobApplication.updateMany({
      where: {
        id: { in: autoRejectedIds },
        jobPostId,
        status: {
          in: [JobApplicationStatus.PENDING, JobApplicationStatus.SHORTLISTED],
        },
      },
      data: {
        status: JobApplicationStatus.REJECTED,
      },
    });

    await tx.jobApplicationStatusHistory.createMany({
      data: remainingEligible.map((item) => ({
        applicationId: item.id,
        fromStatus: item.status,
        toStatus: JobApplicationStatus.REJECTED,
        reasonCode: JobApplicationReasonCode.JOB_FILLED,
        reasonNote: null,
        changedByUserId: null,
        metadata: {
          triggeredByApplicationId: acceptedApplicationId,
        } as Prisma.InputJsonValue,
      })),
    });

    return autoRejectedIds;
  }

  private normalizePage(page?: number): number {
    if (
      typeof page !== 'number' ||
      !Number.isFinite(page) ||
      Math.trunc(page) < 1
    ) {
      return DEFAULT_PAGE;
    }
    return Math.trunc(page);
  }

  private normalizeLimit(limit?: number): number {
    if (
      typeof limit !== 'number' ||
      !Number.isFinite(limit) ||
      Math.trunc(limit) < 1
    ) {
      return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.trunc(limit));
  }

  private buildFilteredWhere(
    jobPostId: string,
    params: FindJobApplicationsParams,
  ): Prisma.JobApplicationWhereInput {
    const where: Prisma.JobApplicationWhereInput = {
      jobPostId,
    };

    if (params.status) {
      where.status = params.status;
    }

    const trimmedSearch = params.search?.trim();
    if (trimmedSearch) {
      const tokens = trimmedSearch.split(/\s+/).filter(Boolean);
      const searchBranches: Prisma.JobApplicationWhereInput[] = [
        {
          worker: {
            user: {
              firstName: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        },
        {
          worker: {
            user: {
              lastName: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        },
        {
          worker: {
            headline: { contains: trimmedSearch, mode: 'insensitive' },
          },
        },
      ];

      // Allow multi-word name queries such as "Jane Doe" to match firstName + lastName together
      if (tokens.length > 1) {
        searchBranches.push({
          AND: tokens.map((token) => ({
            worker: {
              OR: [
                {
                  user: {
                    firstName: { contains: token, mode: 'insensitive' },
                  },
                },
                {
                  user: {
                    lastName: { contains: token, mode: 'insensitive' },
                  },
                },
              ],
            },
          })),
        });
      }

      where.OR = searchBranches;
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: JobApplicationSortBy,
  ): Prisma.JobApplicationOrderByWithRelationInput[] {
    switch (sortBy) {
      case JobApplicationSortBy.OLDEST:
        return [{ appliedAt: 'asc' }, { id: 'asc' }];
      case JobApplicationSortBy.EXPECTED_PAY_ASC:
        return [
          { expectedPay: { sort: 'asc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ];
      case JobApplicationSortBy.EXPECTED_PAY_DESC:
        return [
          { expectedPay: { sort: 'desc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ];
      case JobApplicationSortBy.AVAILABLE_DATE_ASC:
        return [
          { availableDate: { sort: 'asc', nulls: 'last' } },
          { appliedAt: 'desc' },
          { id: 'desc' },
        ];
      case JobApplicationSortBy.RECENT:
      default:
        return [{ appliedAt: 'desc' }, { id: 'desc' }];
    }
  }

  private buildStatusSummary(
    groups: Array<{ status: string; _count: { _all: number } }>,
  ): JobApplicationStatusCounts {
    const summary: JobApplicationStatusCounts = {
      total: 0,
      pending: 0,
      shortlisted: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    };

    for (const group of groups) {
      const count = group._count._all;
      summary.total += count;
      switch (group.status as JobApplicationStatus) {
        case JobApplicationStatus.PENDING:
          summary.pending += count;
          break;
        case JobApplicationStatus.SHORTLISTED:
          summary.shortlisted += count;
          break;
        case JobApplicationStatus.ACCEPTED:
          summary.accepted += count;
          break;
        case JobApplicationStatus.REJECTED:
          summary.rejected += count;
          break;
        case JobApplicationStatus.WITHDRAWN:
          summary.withdrawn += count;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  private mapApplicantToReadModel(
    record: ApplicantPersistenceRecord,
  ): JobApplicationReadModel {
    const latestHistory = record.statusHistory[0];
    const historySummary: JobApplicationHistorySummaryReadModel | null =
      latestHistory
        ? {
            lastChangedAt: latestHistory.createdAt,
            latestReasonCode: latestHistory.reasonCode,
            transitionCount: record._count.statusHistory,
          }
        : null;

    const rawAvatar = record.worker.user.avatarUrl;
    const hasAvatar =
      typeof rawAvatar === 'string' && rawAvatar.trim().length > 0;

    return {
      id: record.id,
      jobPostId: record.jobPostId,
      status: record.status as JobApplicationStatus,
      expectedPay: this.toNullableNumber(record.expectedPay),
      availableDate: record.availableDate
        ? new Date(record.availableDate)
        : null,
      appliedAt: record.appliedAt,
      updatedAt: record.updatedAt,
      worker: {
        id: record.worker.id,
        firstName: record.worker.user.firstName,
        lastName: record.worker.user.lastName,
        location: record.worker.user.location ?? null,
        bio: record.worker.user.bio ?? null,
        headline: record.worker.headline ?? null,
        yearsExperience: record.worker.yearsExperience ?? null,
        responseTimeHours: record.worker.responseTimeHours ?? null,
        availabilityStatus: record.worker.availabilityStatus,
        isOpenToWork: record.worker.isOpenToWork,
        totalCompletedGigs: record.worker.totalCompletedGigs,
        hasAvatar,
        skills: record.worker.skills.map((ws) => ({
          id: ws.skill.id,
          name: ws.skill.name,
          skillType: ws.skillType,
        })),
      },
      historySummary,
    };
  }
}
