import { Injectable } from '@nestjs/common';
import {
  IJobPostRepository,
  JobSortBy,
  FindOpenJobsParams,
  FindOpenJobsResult,
} from '../../domain/repositories/job-post.repository.interface';
import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { SkillEntity } from '../../domain/entities/skill.entity';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { RecruiterProfileEntity } from '../../domain/entities/recruiter-profile.entity';
import { UserEntities } from '../../domain/entities/user.entities';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import {
  ApplicationConflictError,
  ApplicationNotFoundError,
} from '../../application/errors/application.errors';
import { PrismaService } from '../prisma/prisma.service';
import {
  JobPost,
  JobCategory,
  JobPostSkill,
  Skill,
  Prisma,
} from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

export type JobPostPersistenceModel = Prisma.JobPostGetPayload<{
  include: {
    category: true;
    skills: {
      include: {
        skill: true;
      };
    };
    recruiter?: {
      select: {
        company: {
          select: {
            id: true;
            name: true;
            logoUrl: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class PrismaJobPostRepository
  extends PrismaBaseRepository<JobPostEntity, JobPostPersistenceModel>
  implements IJobPostRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.jobPost);
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
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return Number(value);
  }

  private toNullableDecimal(
    value: Prisma.Decimal | number | null | undefined,
  ): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value);
  }

  protected mapToDomain(
    record:
      | JobPost
      | (JobPost & {
          category?: JobCategory | null;
          skills?: Array<JobPostSkill & { skill: Skill }>;
          recruiter?: {
            id?: string;
            userId?: string;
            roleTitle?: string | null;
            yearsExperience?: number | null;
            createdAt?: Date;
            updatedAt?: Date;
            user?: {
              id?: string;
              firstName: string;
              lastName: string;
              avatarUrl?: string | null;
              location?: string | null;
              bio?: string | null;
            } | null;
            company?: {
              id?: string | null;
              name: string;
              logoUrl?: string | null;
              about?: string | null;
              industry?: string | null;
              website?: string | null;
              headquartersLocation?: string | null;
            } | null;
          } | null;
        }),
  ): JobPostEntity {
    const hourlyRate =
      this.toNullableNumber(record.hourlyRateMin) ??
      this.toNullableNumber(record.hourlyRateMax);

    const jobPost = new JobPostEntity({
      id: record.id,
      recruiterId: record.recruiterId,
      categoryId: record.categoryId,
      title: record.title,
      description: record.description,
      workType: record.workType as WorkType,
      workersNeeded: record.workersNeeded,
      startDate: record.startDate,
      estimatedDuration: record.estimatedDuration,
      shiftDuration: record.shiftDuration,
      jobLocation: record.jobLocation,
      jobLocationLat: this.toNullableNumber(record.jobLocationLat),
      jobLocationLng: this.toNullableNumber(record.jobLocationLng),
      paymentStructure: record.paymentStructure as PaymentStructure,
      budgetAmount: this.toNullableNumber(record.budgetAmount),
      hourlyRate,
      hourlyRateMin: hourlyRate,
      hourlyRateMax: hourlyRate,
      status: record.status as JobStatus,
      isBoosted: record.isBoosted,
      boostExpiresAt: record.boostExpiresAt,
      adminReviewStatus: record.adminReviewStatus,
      adminNotes: record.adminNotes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if ('category' in record && record.category) {
      jobPost.category = new JobCategoryEntity({
        id: record.category.id,
        name: record.category.name,
        description: record.category.description,
        createdAt: record.category.createdAt,
      });
    }

    if ('skills' in record && Array.isArray(record.skills)) {
      jobPost.skills = record.skills.map(
        (jps) =>
          new SkillEntity({
            id: jps.skill.id,
            name: jps.skill.name,
            createdAt: jps.skill.createdAt,
          }),
      );
    }

    if (
      'recruiter' in record &&
      record.recruiter &&
      'company' in record.recruiter &&
      record.recruiter.company
    ) {
      jobPost.company = new CompanyEntity({
        id: record.recruiter.company.id ?? '',
        name: record.recruiter.company.name,
        logoUrl: record.recruiter.company.logoUrl ?? null,
        about: record.recruiter.company.about ?? null,
        industry: record.recruiter.company.industry ?? null,
        website: record.recruiter.company.website ?? null,
        headquartersLocation:
          record.recruiter.company.headquartersLocation ?? null,
      });
    } else {
      jobPost.company = null;
    }

    if ('recruiter' in record && record.recruiter && record.recruiter.id) {
      let userEntity: UserEntities | null = null;
      if (
        'user' in record.recruiter &&
        record.recruiter.user &&
        record.recruiter.user.firstName !== undefined
      ) {
        userEntity = new UserEntities({
          id: record.recruiter.user.id ?? '',
          firstName: record.recruiter.user.firstName,
          lastName: record.recruiter.user.lastName,
          avatarUrl: record.recruiter.user.avatarUrl ?? null,
          location: record.recruiter.user.location ?? null,
          bio: record.recruiter.user.bio ?? null,
        });
      }

      jobPost.recruiter = new RecruiterProfileEntity({
        id: record.recruiter.id,
        userId: record.recruiter.userId ?? '',
        roleTitle: record.recruiter.roleTitle ?? null,
        yearsExperience: record.recruiter.yearsExperience ?? null,
        createdAt: record.recruiter.createdAt ?? new Date(),
        updatedAt: record.recruiter.updatedAt ?? new Date(),
        user: userEntity,
        company: jobPost.company,
      });
    } else {
      jobPost.recruiter = null;
    }

    return jobPost;
  }

  async createWithSkills(
    data: Partial<JobPostEntity>,
    skillIds: string[],
  ): Promise<JobPostEntity> {
    return await this.prisma.$transaction(async (tx) => {
      const resolvedHourlyRate =
        data.hourlyRate ?? data.hourlyRateMin ?? data.hourlyRateMax;

      // 1. Create the JobPost record
      const jobPost = await tx.jobPost.create({
        data: {
          recruiterId: data.recruiterId!,
          categoryId: data.categoryId!,
          title: data.title!,
          description: data.description!,
          workType: data.workType!,
          workersNeeded: data.workersNeeded ?? 1,
          startDate: data.startDate ?? null,
          estimatedDuration: data.estimatedDuration ?? null,
          shiftDuration: data.shiftDuration ?? null,
          jobLocation: data.jobLocation ?? null,
          jobLocationLat: this.toNullableDecimal(data.jobLocationLat),
          jobLocationLng: this.toNullableDecimal(data.jobLocationLng),
          paymentStructure: data.paymentStructure!,
          budgetAmount: this.toNullableDecimal(data.budgetAmount),
          hourlyRateMin: this.toNullableDecimal(resolvedHourlyRate),
          hourlyRateMax: this.toNullableDecimal(resolvedHourlyRate),
          status: data.status ?? JobStatus.DRAFT,
          isBoosted: data.isBoosted ?? false,
          boostExpiresAt: data.boostExpiresAt ?? null,
          adminReviewStatus: data.adminReviewStatus ?? 'pending',
          adminNotes: data.adminNotes ?? null,
        },
      });

      // 2. Create associated JobPostSkill records
      if (skillIds && skillIds.length > 0) {
        await tx.jobPostSkill.createMany({
          data: skillIds.map((skillId) => ({
            jobPostId: jobPost.id,
            skillId,
          })),
        });
      }

      // 3. Return created JobPost with category and skills hydrated
      const createdWithRelations = await tx.jobPost.findUnique({
        where: { id: jobPost.id },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!createdWithRelations) {
        throw new Error(
          `Failed to retrieve created job post with id: ${jobPost.id}`,
        );
      }

      return this.mapToDomain(createdWithRelations);
    });
  }

  async updateWithSkills(
    id: string,
    data: Partial<JobPostEntity>,
    skillIds: string[],
  ): Promise<JobPostEntity> {
    return await this.prisma.$transaction(async (tx) => {
      // Lock the target JobPost row first to serialize edits with concurrent acceptApplication transactions
      const lockedJobs = await tx.$queryRaw<
        Array<{ id: string; status: string; workersNeeded: number }>
      >`
        SELECT "id", "status", "workersNeeded"
        FROM "JobPost"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      const lockedJob = lockedJobs[0];
      if (!lockedJob) {
        throw new ApplicationNotFoundError('Job post not found');
      }

      if (
        lockedJob.status === JobStatus.FILLED ||
        lockedJob.status === JobStatus.COMPLETED ||
        lockedJob.status === JobStatus.CANCELLED
      ) {
        throw new ApplicationConflictError(
          `Cannot edit job post with status: ${lockedJob.status}`,
        );
      }

      if (
        data.workersNeeded !== undefined &&
        data.workersNeeded < lockedJob.workersNeeded
      ) {
        const acceptedCount = await tx.jobApplication.count({
          where: {
            jobPostId: id,
            status: JobApplicationStatus.ACCEPTED,
          },
        });

        if (data.workersNeeded < acceptedCount) {
          throw new ApplicationConflictError(
            `Cannot reduce workersNeeded to ${data.workersNeeded} because ${acceptedCount} application${acceptedCount === 1 ? ' has' : 's have'} already been accepted`,
          );
        }
      }

      const resolvedHourlyRate =
        data.hourlyRate !== undefined
          ? data.hourlyRate
          : (data.hourlyRateMin ?? data.hourlyRateMax);

      const updateData: Prisma.JobPostUncheckedUpdateInput = {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.workType !== undefined && { workType: data.workType }),
        ...(data.workersNeeded !== undefined && {
          workersNeeded: data.workersNeeded,
        }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.estimatedDuration !== undefined && {
          estimatedDuration: data.estimatedDuration,
        }),
        ...(data.shiftDuration !== undefined && {
          shiftDuration: data.shiftDuration,
        }),
        ...(data.jobLocation !== undefined && {
          jobLocation: data.jobLocation,
        }),
        ...(data.jobLocationLat !== undefined && {
          jobLocationLat: this.toNullableDecimal(data.jobLocationLat),
        }),
        ...(data.jobLocationLng !== undefined && {
          jobLocationLng: this.toNullableDecimal(data.jobLocationLng),
        }),
        ...(data.paymentStructure !== undefined && {
          paymentStructure: data.paymentStructure,
        }),
        ...(data.budgetAmount !== undefined && {
          budgetAmount: this.toNullableDecimal(data.budgetAmount),
        }),
        ...(resolvedHourlyRate !== undefined && {
          hourlyRateMin: this.toNullableDecimal(resolvedHourlyRate),
          hourlyRateMax: this.toNullableDecimal(resolvedHourlyRate),
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.adminReviewStatus !== undefined && {
          adminReviewStatus: data.adminReviewStatus,
        }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
      };

      // 1. Update the JobPost scalar fields
      await tx.jobPost.update({
        where: { id },
        data: updateData,
      });

      // 2. Remove all existing skills associated with this job post
      await tx.jobPostSkill.deleteMany({
        where: { jobPostId: id },
      });

      // 3. Re-create associated skills if any provided
      if (skillIds && skillIds.length > 0) {
        await tx.jobPostSkill.createMany({
          data: skillIds.map((skillId) => ({
            jobPostId: id,
            skillId,
          })),
        });
      }

      // 4. Return updated JobPost with category and skills hydrated
      const updatedWithRelations = await tx.jobPost.findUnique({
        where: { id },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!updatedWithRelations) {
        throw new Error(`Failed to retrieve updated job post with id: ${id}`);
      }

      return this.mapToDomain(updatedWithRelations);
    });
  }

  override async create(data: Partial<JobPostEntity>): Promise<JobPostEntity> {
    return this.createWithSkills(data, []);
  }

  override async findById(id: string): Promise<JobPostEntity | null> {
    const jobPost = await this.prisma.jobPost.findUnique({
      where: { id },
    });
    if (!jobPost) return null;
    return this.mapToDomain(jobPost);
  }

  async findByIdWithSkills(id: string): Promise<JobPostEntity | null> {
    const jobPost = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
    if (!jobPost) return null;
    return this.mapToDomain(jobPost);
  }

  async findByRecruiterId(recruiterId: string): Promise<JobPostEntity[]> {
    const jobPosts = await this.prisma.jobPost.findMany({
      where: { recruiterId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
    return jobPosts.map((job) => this.mapToDomain(job));
  }

  async findByStatus(status: JobStatus): Promise<JobPostEntity[]> {
    const jobPosts = await this.prisma.jobPost.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
    return jobPosts.map((job) => this.mapToDomain(job));
  }

  override async findAll(): Promise<JobPostEntity[]> {
    const jobPosts = await this.prisma.jobPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
    return jobPosts.map((job) => this.mapToDomain(job));
  }

  override async update(
    id: string,
    data: Partial<JobPostEntity>,
  ): Promise<JobPostEntity> {
    const updateData: Prisma.JobPostUncheckedUpdateInput = {
      ...(data.recruiterId !== undefined && { recruiterId: data.recruiterId }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.workType !== undefined && { workType: data.workType }),
      ...(data.workersNeeded !== undefined && {
        workersNeeded: data.workersNeeded,
      }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.estimatedDuration !== undefined && {
        estimatedDuration: data.estimatedDuration,
      }),
      ...(data.shiftDuration !== undefined && {
        shiftDuration: data.shiftDuration,
      }),
      ...(data.jobLocation !== undefined && { jobLocation: data.jobLocation }),
      ...(data.jobLocationLat !== undefined && {
        jobLocationLat: this.toNullableDecimal(data.jobLocationLat),
      }),
      ...(data.jobLocationLng !== undefined && {
        jobLocationLng: this.toNullableDecimal(data.jobLocationLng),
      }),
      ...(data.paymentStructure !== undefined && {
        paymentStructure: data.paymentStructure,
      }),
      ...(data.budgetAmount !== undefined && {
        budgetAmount: this.toNullableDecimal(data.budgetAmount),
      }),
      ...(data.hourlyRateMin !== undefined && {
        hourlyRateMin: this.toNullableDecimal(data.hourlyRateMin),
      }),
      ...(data.hourlyRateMax !== undefined && {
        hourlyRateMax: this.toNullableDecimal(data.hourlyRateMax),
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.isBoosted !== undefined && { isBoosted: data.isBoosted }),
      ...(data.boostExpiresAt !== undefined && {
        boostExpiresAt: data.boostExpiresAt,
      }),
      ...(data.adminReviewStatus !== undefined && {
        adminReviewStatus: data.adminReviewStatus,
      }),
      ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
    };

    const updated = await this.prisma.jobPost.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return this.mapToDomain(updated);
  }

  override async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.jobPostSkill.deleteMany({ where: { jobPostId: id } });
        await tx.jobPost.delete({ where: { id } });
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025' || error.code === 'P2003') {
          return false;
        }
      }
      throw error;
    }
  }

  async findOpenJobs(params: FindOpenJobsParams): Promise<FindOpenJobsResult> {
    const where: Prisma.JobPostWhereInput = {
      status: JobStatus.OPEN,
    };

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.workType) {
      where.workType = params.workType;
    }

    if (params.location && params.location.trim() !== '') {
      where.jobLocation = {
        contains: params.location.trim(),
        mode: 'insensitive',
      };
    }

    if (params.skillIds && params.skillIds.length > 0) {
      where.skills = {
        some: {
          skillId: {
            in: params.skillIds,
          },
        },
      };
    }

    // Pay filter conditions
    let payFilterConditions: Prisma.JobPostWhereInput[] | null = null;
    if (params.paymentStructure === PaymentStructure.FIXED) {
      where.paymentStructure = PaymentStructure.FIXED;
      if (params.minPay !== undefined || params.maxPay !== undefined) {
        where.budgetAmount = {
          ...(params.minPay !== undefined ? { gte: params.minPay } : {}),
          ...(params.maxPay !== undefined ? { lte: params.maxPay } : {}),
        };
      }
    } else if (params.paymentStructure === PaymentStructure.HOURLY) {
      where.paymentStructure = PaymentStructure.HOURLY;
      if (params.minPay !== undefined || params.maxPay !== undefined) {
        where.hourlyRateMin = {
          ...(params.minPay !== undefined ? { gte: params.minPay } : {}),
          ...(params.maxPay !== undefined ? { lte: params.maxPay } : {}),
        };
      }
    } else if (params.minPay !== undefined || params.maxPay !== undefined) {
      // Payment structure unspecified: match FIXED with budgetAmount in range OR HOURLY with hourlyRateMin in range
      const fixedMatch: Prisma.JobPostWhereInput = {
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: {
          ...(params.minPay !== undefined ? { gte: params.minPay } : {}),
          ...(params.maxPay !== undefined ? { lte: params.maxPay } : {}),
        },
      };
      const hourlyMatch: Prisma.JobPostWhereInput = {
        paymentStructure: PaymentStructure.HOURLY,
        hourlyRateMin: {
          ...(params.minPay !== undefined ? { gte: params.minPay } : {}),
          ...(params.maxPay !== undefined ? { lte: params.maxPay } : {}),
        },
      };
      payFilterConditions = [fixedMatch, hourlyMatch];
    }

    // Search filter across title and description
    let searchConditions: Prisma.JobPostWhereInput[] | null = null;
    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      searchConditions = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Combine OR conditions without collisions
    if (searchConditions && payFilterConditions) {
      where.AND = [{ OR: searchConditions }, { OR: payFilterConditions }];
    } else if (searchConditions) {
      where.OR = searchConditions;
    } else if (payFilterConditions) {
      where.OR = payFilterConditions;
    }

    // Ordering
    const sortBy = params.sortBy ?? JobSortBy.RECENT;
    let orderBy: Prisma.JobPostOrderByWithRelationInput[];

    if (sortBy === JobSortBy.PAY_HIGH) {
      if (params.paymentStructure === PaymentStructure.FIXED) {
        orderBy = [
          { budgetAmount: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      } else if (params.paymentStructure === PaymentStructure.HOURLY) {
        orderBy = [
          { hourlyRateMin: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      } else {
        // Fallback to recent sorting: fixed project budgets and hourly rates are incommensurable units.
        // Comparing raw numeric values across mixed structures produces misleading rankings and database NULL-ordering segregation.
        orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
      }
    } else if (sortBy === JobSortBy.PAY_LOW) {
      if (params.paymentStructure === PaymentStructure.FIXED) {
        orderBy = [
          { budgetAmount: 'asc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      } else if (params.paymentStructure === PaymentStructure.HOURLY) {
        orderBy = [
          { hourlyRateMin: 'asc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      } else {
        // Fallback to recent sorting: fixed project budgets and hourly rates are incommensurable units.
        // Comparing raw numeric values across mixed structures produces misleading rankings and database NULL-ordering segregation.
        orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
      }
    } else {
      // Default: RECENT
      orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 10));
    const skip = (page - 1) * limit;
    const take = limit;

    const [total, records] = await Promise.all([
      this.prisma.jobPost.count({ where }),
      this.prisma.jobPost.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
          recruiter: {
            select: {
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: records.map((record) => this.mapToDomain(record)),
      total,
    };
  }

  async findOpenJobById(id: string): Promise<JobPostEntity | null> {
    const record = await this.prisma.jobPost.findFirst({
      where: {
        id,
        status: JobStatus.OPEN,
      },
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            userId: true,
            roleTitle: true,
            yearsExperience: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                location: true,
                bio: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                about: true,
                industry: true,
                website: true,
                headquartersLocation: true,
              },
            },
          },
        },
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }
}
