import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ITokenService } from '../src/domain/services/token.service.interface';
import { Role } from '../src/domain/enums/role.enum';
import { WorkType } from '../src/domain/enums/work-type.enum';
import { PaymentStructure } from '../src/domain/enums/payment-structure.enum';
import { Server } from 'http';
import cookieParser from 'cookie-parser';
import { configureTrustProxy } from '../src/presentation/proxy/trust-proxy.config';
import { ResponseInterceptor } from '../src/presentation/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/presentation/filters/http-exception.filter';
import { JobCategory, User, RecruiterProfile } from '@prisma/client';

describe('Job Posting Feature (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prismaService: PrismaService;
  let tokenService: ITokenService;
  let configService: ConfigService;

  let recruiterUser: User & { recruiterProfile: RecruiterProfile };
  let workerUser: User;
  let recruiterCookie: string;
  let workerCookie: string;

  let testCategory: JobCategory;
  let testSkillIds: string[];
  const createdJobPostIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new HttpExceptionFilter());
    configService = app.get<ConfigService>(ConfigService);
    configureTrustProxy(app, configService);
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prismaService = app.get<PrismaService>(PrismaService);
    tokenService = app.get<ITokenService>(ITokenService);

    // 1. Identify active, unblocked recruiter user with RecruiterProfile
    const recruiter = await prismaService.user.findFirst({
      where: {
        role: { code: Role.RECRUITER },
        isActive: true,
        isBlocked: false,
        recruiterProfile: { isNot: null },
      },
      include: {
        role: true,
        recruiterProfile: true,
      },
    });

    if (!recruiter || !recruiter.recruiterProfile) {
      throw new Error(
        'Prerequisite setup failed: No active unblocked recruiter with RecruiterProfile found in database',
      );
    }
    recruiterUser = recruiter as User & { recruiterProfile: RecruiterProfile };

    // 2. Identify active, unblocked worker user for authorization testing
    const worker = await prismaService.user.findFirst({
      where: {
        role: { code: Role.WORKER },
        isActive: true,
        isBlocked: false,
      },
      include: {
        role: true,
      },
    });

    if (!worker) {
      throw new Error(
        'Prerequisite setup failed: No active unblocked worker found in database',
      );
    }
    workerUser = worker;

    // 3. Issue authentication cookies
    const recruiterToken = await tokenService.issueAccessToken({
      sub: recruiterUser.id,
      email: recruiterUser.email,
      role: Role.RECRUITER,
    });
    recruiterCookie = `access_token=${recruiterToken}`;

    const workerToken = await tokenService.issueAccessToken({
      sub: workerUser.id,
      email: workerUser.email,
      role: Role.WORKER,
    });
    workerCookie = `access_token=${workerToken}`;

    // 4. Retrieve existing skills from database
    const skills = await prismaService.skill.findMany({ take: 2 });
    if (skills.length < 2) {
      throw new Error(
        'Prerequisite setup failed: Database must contain at least 2 skills for E2E testing',
      );
    }
    testSkillIds = skills.map((s) => s.id);

    // 5. Create uniquely named temporary JobCategory
    testCategory = await prismaService.jobCategory.create({
      data: {
        name: `E2E-Category-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description: 'Temporary category for Job Posting E2E verification',
      },
    });
  });

  afterAll(async () => {
    try {
      // 1. Delete all JobPost records created in this test suite and their dependent records
      for (const jobId of createdJobPostIds) {
        try {
          await prismaService.jobApplicationStatusHistory.deleteMany({
            where: { application: { jobPostId: jobId } },
          });
          await prismaService.jobApplication.deleteMany({
            where: { jobPostId: jobId },
          });
          await prismaService.jobPostSkill.deleteMany({
            where: { jobPostId: jobId },
          });
          await prismaService.jobPost.deleteMany({
            where: { id: jobId },
          });
        } catch (err) {
          console.error(`Failed to cleanup job post ${jobId}:`, err);
        }
      }

      // 2. Delete the temporary test category
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
      if (app) {
        await app.close();
      }
    }
  });

  describe('A. GET /job-categories', () => {
    it('request succeeds without authentication and returns the standard envelope containing the test category', async () => {
      const res = await request(httpServer).get('/job-categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find(
        (c: { id: string; name: string }) => c.id === testCategory.id,
      );
      expect(found).toBeDefined();
      expect(found.name).toBe(testCategory.name);
      expect(found.description).toBe(testCategory.description);
    });
  });

  describe('B. POST /recruiter/jobs/draft', () => {
    it('returns 401 Unauthorized when authentication cookie is missing', async () => {
      const res = await request(httpServer).post('/recruiter/jobs/draft').send({
        categoryId: testCategory.id,
        title: 'Unauthenticated Job',
        description: 'Should fail authentication',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.FIXED,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('returns 403 Forbidden when authenticated as a non-recruiter (WORKER)', async () => {
      const res = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [workerCookie])
        .send({
          categoryId: testCategory.id,
          title: 'Worker Creating Job',
          description: 'Should fail RBAC check',
          workType: WorkType.LOCAL,
          paymentStructure: PaymentStructure.FIXED,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
    });

    it('returns 400 Bad Request when DTO input fails validation', async () => {
      const res = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [recruiterCookie])
        .send({
          // Missing required categoryId, description, workType, paymentStructure
          title: 'Incomplete Job',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('returns 404 Not Found when category does not exist', async () => {
      const nonExistentCategoryId = '00000000-0000-0000-0000-000000000000';
      const res = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [recruiterCookie])
        .send({
          categoryId: nonExistentCategoryId,
          title: 'Missing Category Job',
          description: 'Should fail category lookup',
          workType: WorkType.LOCAL,
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: 500,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Job category not found');
    });

    it('returns 400 Bad Request when non-existent skill IDs are provided', async () => {
      const nonExistentSkillId = 'a0000000-0000-4000-8000-000000000000';
      const res = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [recruiterCookie])
        .send({
          categoryId: testCategory.id,
          title: 'Invalid Skill Job',
          description: 'Should fail skill lookup',
          workType: WorkType.LOCAL,
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: 500,
          skillIds: [nonExistentSkillId],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain(
        'One or more selected skills do not exist',
      );
    });

    it('creates a draft successfully with valid recruiter request and persists to PostgreSQL', async () => {
      const validPayload = {
        categoryId: testCategory.id,
        title: `E2E Event Coordinator ${Date.now()}`,
        description:
          'Seeking an experienced event coordinator for conference staging.',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
        workersNeeded: 3,
        jobLocation: 'Convention Center, Hall A',
        jobLocationLat: 37.774929,
        jobLocationLng: -122.419416,
        hourlyRate: 35.0,
        skillIds: testSkillIds,
      };

      const res = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [recruiterCookie])
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(201);

      const jobData = res.body.data;
      expect(jobData.id).toBeDefined();
      createdJobPostIds.push(jobData.id);

      // Verify response payload fields
      expect(jobData.recruiterId).toBe(recruiterUser.recruiterProfile.id);
      expect(jobData.categoryId).toBe(testCategory.id);
      expect(jobData.title).toBe(validPayload.title);
      expect(jobData.description).toBe(validPayload.description);
      expect(jobData.workType).toBe(validPayload.workType);
      expect(jobData.workersNeeded).toBe(3);
      expect(jobData.paymentStructure).toBe(validPayload.paymentStructure);
      expect(jobData.hourlyRate).toBe(35.0);
      expect(jobData.hourlyRateMin).toBe(35.0);
      expect(jobData.hourlyRateMax).toBe(35.0);
      expect(jobData.status).toBe('draft');
      expect(jobData.adminReviewStatus).toBe('pending');

      // Verify hydrated relations in response
      expect(jobData.category).toBeDefined();
      expect(jobData.category.id).toBe(testCategory.id);
      expect(jobData.category.name).toBe(testCategory.name);
      expect(jobData.skills).toBeDefined();
      expect(jobData.skills).toHaveLength(testSkillIds.length);

      // Verify actual persistence in PostgreSQL
      const dbJob = await prismaService.jobPost.findUnique({
        where: { id: jobData.id },
        include: {
          category: true,
          skills: true,
        },
      });

      expect(dbJob).not.toBeNull();
      expect(dbJob!.id).toBe(jobData.id);
      expect(dbJob!.recruiterId).toBe(recruiterUser.recruiterProfile.id);
      expect(dbJob!.categoryId).toBe(testCategory.id);
      expect(dbJob!.status).toBe('draft');
      expect(dbJob!.adminReviewStatus).toBe('pending');
      expect(dbJob!.category.name).toBe(testCategory.name);

      // Verify JobPostSkill join table records in PostgreSQL
      const dbSkills = await prismaService.jobPostSkill.findMany({
        where: { jobPostId: jobData.id },
      });
      expect(dbSkills).toHaveLength(testSkillIds.length);
      const dbSkillIds = dbSkills.map((s) => s.skillId).sort();
      expect(dbSkillIds).toEqual([...testSkillIds].sort());
    });
  });

  describe('C. PATCH /recruiter/jobs/:id/publish', () => {
    let draftJobId: string;

    beforeAll(async () => {
      // Create a dedicated valid draft job post to exercise the publish workflow
      const draftRes = await request(httpServer)
        .post('/recruiter/jobs/draft')
        .set('Cookie', [recruiterCookie])
        .send({
          categoryId: testCategory.id,
          title: `Publishable Draft ${Date.now()}`,
          description:
            'Complete job specification meeting all publishing requirements.',
          workType: WorkType.LOCAL,
          jobLocation: 'Main Exhibition Hall',
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: 1200.0,
          workersNeeded: 1,
          skillIds: testSkillIds,
        });

      expect(draftRes.status).toBe(201);
      draftJobId = draftRes.body.data.id;
      createdJobPostIds.push(draftJobId);
    });

    it('returns 401 Unauthorized when authentication cookie is missing', async () => {
      const res = await request(httpServer).patch(
        `/recruiter/jobs/${draftJobId}/publish`,
      );

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('returns 400 Bad Request when job ID parameter is not a valid UUID', async () => {
      const res = await request(httpServer)
        .patch('/recruiter/jobs/not-a-valid-uuid/publish')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('Validation failed');
    });

    it('returns 404 Not Found when job post does not exist', async () => {
      const nonExistentJobId = '00000000-0000-0000-0000-000000000000';
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${nonExistentJobId}/publish`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Job post not found');
    });

    it('allows the owner recruiter to publish the draft and verifies OPEN status in PostgreSQL', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${draftJobId}/publish`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);

      const publishedData = res.body.data;
      expect(publishedData.id).toBe(draftJobId);
      expect(publishedData.status).toBe('open');
      expect(publishedData.adminReviewStatus).toBe('pending');
      expect(publishedData.category).toBeDefined();
      expect(publishedData.category.id).toBe(testCategory.id);
      expect(publishedData.skills).toBeDefined();
      expect(publishedData.skills).toHaveLength(testSkillIds.length);

      // Verify PostgreSQL reflects updated OPEN status
      const dbJob = await prismaService.jobPost.findUnique({
        where: { id: draftJobId },
      });

      expect(dbJob).not.toBeNull();
      expect(dbJob!.status).toBe('open');
      expect(dbJob!.adminReviewStatus).toBe('pending');
    });

    it('rejects publishing an already-published job post with 400 Bad Request', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${draftJobId}/publish`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe(
        'Only draft job posts can be published. Current status: open',
      );
    });
  });

  describe('D. GET /recruiter/jobs', () => {
    it('returns 401 Unauthorized when authentication cookie is missing', async () => {
      const res = await request(httpServer).get('/recruiter/jobs');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('returns 403 Forbidden when authenticated as a non-recruiter (WORKER)', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs')
        .set('Cookie', [workerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'Access denied: You do not have the required role to access this resource',
      );
    });

    it('returns 400 Bad Request when query parameter contains invalid status filter', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs?status=unsupported_status')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('Status filter must be one of');
    });

    it('returns 400 Bad Request when non-whitelisted property (recruiterId) is supplied in query', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs?recruiterId=spoofed-recruiter-id')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain(
        'property recruiterId should not exist',
      );
    });

    it('returns 200 with summary and items array for authenticated recruiter with default status all', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();

      const { summary, items } = res.body.data;
      expect(summary).toBeDefined();
      expect(typeof summary.total).toBe('number');
      expect(typeof summary.active).toBe('number');
      expect(typeof summary.draft).toBe('number');
      expect(typeof summary.paused).toBe('number');
      expect(typeof summary.closed).toBe('number');
      expect(typeof summary.activeLocal).toBe('number');
      expect(typeof summary.activeRemote).toBe('number');
      expect(Array.isArray(items)).toBe(true);

      // Verify all returned jobs belong to the authenticated recruiter
      for (const item of items) {
        expect(item.recruiterId).toBe(recruiterUser.recruiterProfile.id);
      }
    });

    it('returns 200 with filtered items when status=active is requested', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs?status=active')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);

      const { summary, items } = res.body.data;
      expect(summary).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
      for (const item of items) {
        expect(item.status).toBe('open');
      }
    });

    it('returns 200 with filtered items when status=draft is requested', async () => {
      const res = await request(httpServer)
        .get('/recruiter/jobs?status=draft')
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);

      const { summary, items } = res.body.data;
      expect(summary).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
      for (const item of items) {
        expect(item.status).toBe('draft');
      }
    });
  });

  describe('G. PATCH /recruiter/jobs/:id/applications/:applicationId/{shortlist,accept,reject}', () => {
    let hireJobId: string;
    let app1Id: string;
    let app2Id: string;
    let app3Id: string;
    const tempUserIds: string[] = [];
    const tempWorkerProfileIds: string[] = [];

    beforeAll(async () => {
      const workerRole = await prismaService.appRole.findFirst({
        where: { code: Role.WORKER },
      });
      if (!workerRole) {
        throw new Error('Prerequisite setup failed: WORKER AppRole must exist');
      }

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      for (let i = 1; i <= 3; i++) {
        const user = await prismaService.user.create({
          data: {
            email: `e2e-hire-worker-${suffix}-${i}@example.com`,
            passwordHash: 'test-hash-not-for-login',
            roleId: workerRole.id,
            firstName: `HireWorker${i}`,
            lastName: 'E2E',
          },
        });
        tempUserIds.push(user.id);

        const profile = await prismaService.workerProfile.create({
          data: { userId: user.id },
        });
        tempWorkerProfileIds.push(profile.id);
      }

      const job = await prismaService.jobPost.create({
        data: {
          recruiterId: recruiterUser.recruiterProfile.id,
          categoryId: testCategory.id,
          title: `E2E Hiring Flow Job ${suffix}`,
          description:
            'E2E test job for hiring workflow presentation endpoints',
          workType: 'remote',
          workersNeeded: 1,
          paymentStructure: 'fixed',
          budgetAmount: '300.00',
          status: 'open',
          adminReviewStatus: 'approved',
        },
      });
      hireJobId = job.id;
      createdJobPostIds.push(hireJobId);

      const app1 = await prismaService.jobApplication.create({
        data: {
          jobPostId: hireJobId,
          workerId: tempWorkerProfileIds[0],
          status: 'pending',
        },
      });
      const app2 = await prismaService.jobApplication.create({
        data: {
          jobPostId: hireJobId,
          workerId: tempWorkerProfileIds[1],
          status: 'pending',
        },
      });
      const app3 = await prismaService.jobApplication.create({
        data: {
          jobPostId: hireJobId,
          workerId: tempWorkerProfileIds[2],
          status: 'pending',
        },
      });
      app1Id = app1.id;
      app2Id = app2.id;
      app3Id = app3.id;
    });

    afterAll(async () => {
      try {
        if (hireJobId) {
          await prismaService.jobApplicationStatusHistory.deleteMany({
            where: { application: { jobPostId: hireJobId } },
          });
          await prismaService.jobApplication.deleteMany({
            where: { jobPostId: hireJobId },
          });
        }
        if (tempWorkerProfileIds.length > 0) {
          await prismaService.workerProfile.deleteMany({
            where: { id: { in: tempWorkerProfileIds } },
          });
        }
        if (tempUserIds.length > 0) {
          await prismaService.user.deleteMany({
            where: { id: { in: tempUserIds } },
          });
        }
      } catch (err) {
        console.error('Failed to cleanup hiring flow E2E test data:', err);
      }
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(httpServer).patch(
        `/recruiter/jobs/${hireJobId}/applications/${app1Id}/shortlist`,
      );
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated user has WORKER role', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app1Id}/shortlist`)
        .set('Cookie', [workerCookie]);
      expect(res.status).toBe(403);
    });

    it('returns 400 when job id or applicationId is not a valid UUID', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/not-a-uuid/applications/${app1Id}/shortlist`)
        .set('Cookie', [recruiterCookie]);
      expect(res.status).toBe(400);
    });

    it('returns 400 when non-whitelisted fields such as recruiterId are sent in request body', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app1Id}/shortlist`)
        .set('Cookie', [recruiterCookie])
        .send({ recruiterId: '00000000-0000-0000-0000-000000000001' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when target application does not exist', async () => {
      const missingId = '00000000-0000-0000-0000-000000000099';
      const res = await request(httpServer)
        .patch(
          `/recruiter/jobs/${hireJobId}/applications/${missingId}/shortlist`,
        )
        .set('Cookie', [recruiterCookie]);
      expect(res.status).toBe(404);
    });

    it('PATCH .../shortlist returns 200 and updates application status to shortlisted', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app1Id}/shortlist`)
        .set('Cookie', [recruiterCookie])
        .send({ reasonNote: '  Strong fit  ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        applicationId: app1Id,
        jobPostId: hireJobId,
        status: 'shortlisted',
        jobStatus: 'open',
      });
      expect(res.body.data.autoRejectedApplicationIds).toBeUndefined();
    });

    it('PATCH .../reject returns 200 and updates application status to rejected', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app3Id}/reject`)
        .set('Cookie', [recruiterCookie])
        .send({ reasonNote: 'Role mismatch' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        applicationId: app3Id,
        jobPostId: hireJobId,
        status: 'rejected',
        jobStatus: 'open',
      });
    });

    it('PATCH .../accept returns 200, fills the job, auto-rejects competing pending applicant, and omits internal IDs', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app1Id}/accept`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        applicationId: app1Id,
        jobPostId: hireJobId,
        status: 'accepted',
        jobStatus: 'filled',
        workersNeeded: 1,
        acceptedCount: 1,
        jobFilled: true,
        autoRejectedCount: 1,
      });
      expect(res.body.data.autoRejectedApplicationIds).toBeUndefined();
    });

    it('returns 409 when transitioning an auto-rejected or already filled application', async () => {
      const res = await request(httpServer)
        .patch(`/recruiter/jobs/${hireJobId}/applications/${app2Id}/accept`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(409);
    });
  });
});
