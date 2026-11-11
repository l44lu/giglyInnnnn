import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaJobPostRepository } from './prisma-job-post.repository';
import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { Prisma, JobCategory, RecruiterProfile, Skill } from '@prisma/client';

describe('PrismaJobPostRepository Transaction Rollback (Integration)', () => {
  let prismaService: PrismaService;
  let repository: PrismaJobPostRepository;
  let testCategory: JobCategory;
  let existingRecruiter: RecruiterProfile;
  let existingSkill: Skill;
  const createdJobPostIds: string[] = [];

  // Syntactically valid UUIDv4 that does NOT exist in the Skill table
  const nonExistentSkillId = 'a0000000-0000-4000-8000-000000000000';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaJobPostRepository],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<PrismaJobPostRepository>(
      PrismaJobPostRepository,
    );
    await prismaService.onModuleInit();

    // 1. Find an existing valid recruiter profile
    const recruiter = await prismaService.recruiterProfile.findFirst();
    if (!recruiter) {
      throw new Error(
        'Prerequisite setup failed: At least one RecruiterProfile must exist in the database',
      );
    }
    existingRecruiter = recruiter;

    // 2. Find an existing valid skill for the baseline test
    const skill = await prismaService.skill.findFirst();
    if (!skill) {
      throw new Error(
        'Prerequisite setup failed: At least one Skill must exist in the database',
      );
    }
    existingSkill = skill;

    // 3. Create a unique temporary JobCategory for this test suite
    testCategory = await prismaService.jobCategory.create({
      data: {
        name: `Rollback-Cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description:
          'Temporary category for repository rollback integration testing',
      },
    });
  });

  afterAll(async () => {
    try {
      // 1. Clean up any job posts created during baseline tests
      for (const jobId of createdJobPostIds) {
        try {
          await prismaService.jobPostSkill.deleteMany({
            where: { jobPostId: jobId },
          });
          await prismaService.jobPost.deleteMany({
            where: { id: jobId },
          });
        } catch (err) {
          console.error(`Failed to cleanup test job post ${jobId}:`, err);
        }
      }

      // 2. Clean up the temporary test category
      if (testCategory) {
        try {
          await prismaService.jobCategory.deleteMany({
            where: { id: testCategory.id },
          });
        } catch (err) {
          console.error(
            `Failed to cleanup test category ${testCategory.id}:`,
            err,
          );
        }
      }
    } finally {
      await prismaService.$disconnect();
    }
  });

  it('baseline: createWithSkills persists both JobPost and JobPostSkill when all relations are valid', async () => {
    const baselineTitle = `Baseline Valid Job ${Date.now()}`;
    const jobPostData: Partial<JobPostEntity> = {
      recruiterId: existingRecruiter.id,
      categoryId: testCategory.id,
      title: baselineTitle,
      description: 'Baseline test job to verify normal persistence flow',
      workType: WorkType.LOCAL,
      workersNeeded: 1,
      paymentStructure: PaymentStructure.FIXED,
      budgetAmount: 300,
      status: JobStatus.DRAFT,
      adminReviewStatus: 'pending',
    };

    const created = await repository.createWithSkills(jobPostData, [
      existingSkill.id,
    ]);

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    createdJobPostIds.push(created.id);

    // Verify direct PostgreSQL persistence
    const dbJob = await prismaService.jobPost.findUnique({
      where: { id: created.id },
      include: { skills: true },
    });

    expect(dbJob).not.toBeNull();
    expect(dbJob!.id).toBe(created.id);
    expect(dbJob!.title).toBe(baselineTitle);
    expect(dbJob!.skills).toHaveLength(1);
    expect(dbJob!.skills[0].skillId).toBe(existingSkill.id);
  });

  it('rollback verification: rolls back JobPost creation when skill-relation insertion fails', async () => {
    const rollbackTestTitle = `Rollback Test Job ${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const jobPostData: Partial<JobPostEntity> = {
      recruiterId: existingRecruiter.id,
      categoryId: testCategory.id,
      title: rollbackTestTitle,
      description:
        'This job post must be rolled back because skill relation will fail FK constraint',
      workType: WorkType.LOCAL,
      workersNeeded: 2,
      paymentStructure: PaymentStructure.HOURLY,
      hourlyRateMin: 20,
      hourlyRateMax: 35,
      status: JobStatus.DRAFT,
      adminReviewStatus: 'pending',
    };

    // 1. Confirm the nonexistent skill ID is indeed absent from PostgreSQL
    const skillCheck = await prismaService.skill.findUnique({
      where: { id: nonExistentSkillId },
    });
    expect(skillCheck).toBeNull();

    // 2. Execute createWithSkills with nonexistent skill ID and expect failure
    let caughtError: unknown;
    try {
      await repository.createWithSkills(jobPostData, [nonExistentSkillId]);
    } catch (err) {
      caughtError = err;
    }

    // 3. Verify that the failure was caused by the foreign-key constraint violation on JobPostSkill
    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
    expect(prismaError.code).toBe('P2003');
    expect(prismaError.message).toContain('JobPostSkill_skillId_fkey');

    // 4. Verify PostgreSQL persistence: JobPost record must NOT exist
    const persistedJob = await prismaService.jobPost.findFirst({
      where: { title: rollbackTestTitle },
    });
    expect(persistedJob).toBeNull();

    // 5. Verify PostgreSQL persistence: No orphan JobPostSkill records exist
    const orphanSkills = await prismaService.jobPostSkill.findMany({
      where: { skillId: nonExistentSkillId },
    });
    expect(orphanSkills).toHaveLength(0);
  });
});
