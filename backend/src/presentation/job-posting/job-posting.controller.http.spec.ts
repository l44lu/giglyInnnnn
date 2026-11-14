import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JobPostingController } from './job-posting.controller';
import { IGetJobCategoriesUseCase } from '../../application/use-cases/job-posting/interface/get-job-categories.use-case.interface';
import { IGetRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { ICreateDraftJobPostUseCase } from '../../application/use-cases/job-posting/interface/create-draft-job-post.use-case.interface';
import { IPublishJobPostUseCase } from '../../application/use-cases/job-posting/interface/publish-job-post.use-case.interface';
import { IGetRecruiterJobPostsUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-posts.use-case.interface';
import { IGetRecruiterJobPostByIdUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-post-by-id.use-case.interface';
import { IUpdateJobPostUseCase } from '../../application/use-cases/job-posting/interface/update-job-post.use-case.interface';
import { ITransitionJobPostStatusUseCase } from '../../application/use-cases/job-posting/interface/transition-job-post-status.use-case.interface';
import { IGetJobApplicationsUseCase } from '../../application/use-cases/job-posting/interface/get-job-applications.use-case.interface';
import { GetJobApplicationsUseCase } from '../../application/use-cases/job-posting/implementation/get-job-applications.use-case';
import { IShortlistJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/shortlist-job-application.use-case.interface';
import { ShortlistJobApplicationUseCase } from '../../application/use-cases/job-posting/implementation/shortlist-job-application.use-case';
import { IAcceptJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/accept-job-application.use-case.interface';
import { AcceptJobApplicationUseCase } from '../../application/use-cases/job-posting/implementation/accept-job-application.use-case';
import { IRejectJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/reject-job-application.use-case.interface';
import { RejectJobApplicationUseCase } from '../../application/use-cases/job-posting/implementation/reject-job-application.use-case';
import { JobApplicationEntity } from '../../domain/entities/job-application.entity';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
} from '../../application/errors/application.errors';
import { IRecruiterProfileRepository } from '../../domain/repositories/recruiter-profile.repository.interface';
import { IJobPostRepository } from '../../domain/repositories/job-post.repository.interface';
import {
  FindJobApplicationsResult,
  IJobApplicationRepository,
  JobApplicationSortBy,
} from '../../domain/repositories/job-application.repository.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { ITokenService } from '../../domain/services/token.service.interface';
import { JwtTokenService } from '../../infrastructure/security/jwt-token.service';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  AuthCookieService,
} from '../auth/services/auth-cookie.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { Role } from '../../domain/enums/role.enum';
import { UserEntities } from '../../domain/entities/user.entities';
import { RecruiterProfileEntity } from '../../domain/entities/recruiter-profile.entity';
import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';

describe('JobPostingController HTTP Pipeline (/recruiter/jobs/:id/applications)', () => {
  let app: INestApplication;

  let getJobCategoriesUseCase: jest.Mocked<IGetJobCategoriesUseCase>;
  let getRecruiterProfileUseCase: jest.Mocked<IGetRecruiterProfileUseCase>;
  let createDraftJobPostUseCase: jest.Mocked<ICreateDraftJobPostUseCase>;
  let publishJobPostUseCase: jest.Mocked<IPublishJobPostUseCase>;
  let getRecruiterJobPostsUseCase: jest.Mocked<IGetRecruiterJobPostsUseCase>;
  let getRecruiterJobPostByIdUseCase: jest.Mocked<IGetRecruiterJobPostByIdUseCase>;
  let updateJobPostUseCase: jest.Mocked<IUpdateJobPostUseCase>;
  let transitionJobPostStatusUseCase: jest.Mocked<ITransitionJobPostStatusUseCase>;

  let mockRecruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let mockJobPostRepository: jest.Mocked<IJobPostRepository>;
  let mockJobApplicationRepository: jest.Mocked<IJobApplicationRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  let ownerToken: string;
  let otherRecruiterToken: string;
  let noProfileRecruiterToken: string;
  let blockedRecruiterToken: string;
  let workerToken: string;
  let adminToken: string;

  const ownerUserId = '11111111-1111-4111-8111-111111111111';
  const otherRecruiterUserId = '22222222-2222-4222-8222-222222222222';
  const noProfileRecruiterUserId = '33333333-3333-4333-8333-333333333333';
  const blockedRecruiterUserId = '44444444-4444-4444-8444-444444444444';
  const workerUserId = '55555555-5555-4555-8555-555555555555';
  const adminUserId = '66666666-6666-4666-8666-666666666666';

  const ownerRecruiterProfileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherRecruiterProfileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const ownerJobId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const missingJobId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  const ownerUser = new UserEntities({
    id: ownerUserId,
    email: 'owner@example.com',
    passWordHash: 'hash',
    role: Role.RECRUITER,
    firstName: 'Owner',
    lastName: 'Recruiter',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const otherRecruiterUser = new UserEntities({
    id: otherRecruiterUserId,
    email: 'other@example.com',
    passWordHash: 'hash',
    role: Role.RECRUITER,
    firstName: 'Other',
    lastName: 'Recruiter',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const noProfileRecruiterUser = new UserEntities({
    id: noProfileRecruiterUserId,
    email: 'noprofile@example.com',
    passWordHash: 'hash',
    role: Role.RECRUITER,
    firstName: 'NoProfile',
    lastName: 'Recruiter',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const blockedRecruiterUser = new UserEntities({
    id: blockedRecruiterUserId,
    email: 'blocked@example.com',
    passWordHash: 'hash',
    role: Role.RECRUITER,
    firstName: 'Blocked',
    lastName: 'Recruiter',
    isActive: true,
    isBlocked: true,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const workerUser = new UserEntities({
    id: workerUserId,
    email: 'worker@example.com',
    passWordHash: 'hash',
    role: Role.WORKER,
    firstName: 'Worker',
    lastName: 'User',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const adminUser = new UserEntities({
    id: adminUserId,
    email: 'admin@example.com',
    passWordHash: 'hash',
    role: Role.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  });

  const ownerProfile = new RecruiterProfileEntity({
    id: ownerRecruiterProfileId,
    userId: ownerUserId,
  });

  const otherProfile = new RecruiterProfileEntity({
    id: otherRecruiterProfileId,
    userId: otherRecruiterUserId,
  });

  const ownerJobPost = new JobPostEntity({
    id: ownerJobId,
    recruiterId: ownerRecruiterProfileId,
    categoryId: 'cat-uuid-1',
    title: 'Warehouse Lead',
    description: 'Lead warehouse shift',
    workType: WorkType.LOCAL,
    workersNeeded: 2,
    paymentStructure: PaymentStructure.HOURLY,
    hourlyRate: 25,
    status: JobStatus.OPEN,
    adminReviewStatus: 'approved',
    adminNotes: 'Internal admin review note',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
  });

  const sampleRepositoryResult: FindJobApplicationsResult = {
    job: {
      id: ownerJobId,
      title: 'Warehouse Lead',
      status: JobStatus.OPEN,
      workersNeeded: 2,
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 25,
      acceptedCount: 1,
    },
    summary: {
      total: 1,
      pending: 1,
      shortlisted: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    },
    items: [
      {
        id: 'app-uuid-1',
        jobPostId: ownerJobId,
        status: JobApplicationStatus.PENDING,
        expectedPay: 26,
        availableDate: new Date('2026-11-20T00:00:00.000Z'),
        appliedAt: new Date('2026-11-11T10:00:00.000Z'),
        updatedAt: new Date('2026-11-11T10:00:00.000Z'),
        worker: {
          id: 'worker-profile-uuid-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          location: 'Austin, TX',
          bio: 'Experienced team lead',
          headline: 'Logistics Coordinator',
          yearsExperience: 6,
          responseTimeHours: 1,
          availabilityStatus: 'AVAILABLE',
          isOpenToWork: true,
          totalCompletedGigs: 18,
          hasAvatar: true,
          skills: [
            {
              id: 'skill-uuid-1',
              name: 'Inventory Management',
              skillType: 'primary',
            },
          ],
        },
        historySummary: {
          lastChangedAt: new Date('2026-11-11T10:00:00.000Z'),
          latestReasonCode: JobApplicationReasonCode.APPLIED,
          transitionCount: 1,
        },
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeAll(async () => {
    const jwtService = new JwtService({});
    const configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'test-jwt-secret-key-at-least-32-chars!';
          case 'JWT_EXPIRES_IN':
            return '1h';
          case 'JWT_ISSUER':
            return 'gigly-auth';
          case 'JWT_AUDIENCE':
            return 'gigly-app';
          case 'NODE_ENV':
            return 'test';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    const tokenService = new JwtTokenService(jwtService, configService);

    ownerToken = await tokenService.issueAccessToken({
      sub: ownerUser.id,
      email: ownerUser.email,
      role: Role.RECRUITER,
    });
    otherRecruiterToken = await tokenService.issueAccessToken({
      sub: otherRecruiterUser.id,
      email: otherRecruiterUser.email,
      role: Role.RECRUITER,
    });
    noProfileRecruiterToken = await tokenService.issueAccessToken({
      sub: noProfileRecruiterUser.id,
      email: noProfileRecruiterUser.email,
      role: Role.RECRUITER,
    });
    blockedRecruiterToken = await tokenService.issueAccessToken({
      sub: blockedRecruiterUser.id,
      email: blockedRecruiterUser.email,
      role: Role.RECRUITER,
    });
    workerToken = await tokenService.issueAccessToken({
      sub: workerUser.id,
      email: workerUser.email,
      role: Role.WORKER,
    });
    adminToken = await tokenService.issueAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    getJobCategoriesUseCase = { execute: jest.fn() };
    getRecruiterProfileUseCase = { execute: jest.fn() };
    createDraftJobPostUseCase = { execute: jest.fn() };
    publishJobPostUseCase = { execute: jest.fn() };
    getRecruiterJobPostsUseCase = { execute: jest.fn() };
    getRecruiterJobPostByIdUseCase = { execute: jest.fn() };
    updateJobPostUseCase = { execute: jest.fn() };
    transitionJobPostStatusUseCase = { execute: jest.fn() };

    mockRecruiterProfileRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockJobPostRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByRecruiterId: jest.fn(),
      findByStatus: jest.fn(),
      createWithSkills: jest.fn(),
      findByIdWithSkills: jest.fn(),
      updateWithSkills: jest.fn(),
      findOpenJobs: jest.fn(),
      findOpenJobById: jest.fn(),
    };

    mockJobApplicationRepository = {
      findById: jest.fn(),
      findByJobAndWorker: jest.fn(),
      findByJobPostId: jest.fn(),
      create: jest.fn(),
      shortlistApplication: jest.fn(),
      rejectApplication: jest.fn(),
      acceptApplication: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IJobApplicationRepository>;

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [JobPostingController],
      providers: [
        {
          provide: IGetJobCategoriesUseCase,
          useValue: getJobCategoriesUseCase,
        },
        {
          provide: IGetRecruiterProfileUseCase,
          useValue: getRecruiterProfileUseCase,
        },
        {
          provide: ICreateDraftJobPostUseCase,
          useValue: createDraftJobPostUseCase,
        },
        { provide: IPublishJobPostUseCase, useValue: publishJobPostUseCase },
        {
          provide: IGetRecruiterJobPostsUseCase,
          useValue: getRecruiterJobPostsUseCase,
        },
        {
          provide: IGetRecruiterJobPostByIdUseCase,
          useValue: getRecruiterJobPostByIdUseCase,
        },
        { provide: IUpdateJobPostUseCase, useValue: updateJobPostUseCase },
        {
          provide: ITransitionJobPostStatusUseCase,
          useValue: transitionJobPostStatusUseCase,
        },
        {
          provide: IGetJobApplicationsUseCase,
          useClass: GetJobApplicationsUseCase,
        },
        {
          provide: IShortlistJobApplicationUseCase,
          useClass: ShortlistJobApplicationUseCase,
        },
        {
          provide: IAcceptJobApplicationUseCase,
          useClass: AcceptJobApplicationUseCase,
        },
        {
          provide: IRejectJobApplicationUseCase,
          useClass: RejectJobApplicationUseCase,
        },
        {
          provide: IRecruiterProfileRepository,
          useValue: mockRecruiterProfileRepository,
        },
        { provide: IJobPostRepository, useValue: mockJobPostRepository },
        {
          provide: IJobApplicationRepository,
          useValue: mockJobApplicationRepository,
        },
        { provide: ITokenService, useValue: tokenService },
        { provide: IUserRepository, useValue: mockUserRepository },
        { provide: ConfigService, useValue: configService },
        AuthCookieService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    const reflector = app.get(Reflector);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository.findById.mockImplementation((id: string) => {
      switch (id) {
        case ownerUserId:
          return Promise.resolve(ownerUser);
        case otherRecruiterUserId:
          return Promise.resolve(otherRecruiterUser);
        case noProfileRecruiterUserId:
          return Promise.resolve(noProfileRecruiterUser);
        case blockedRecruiterUserId:
          return Promise.resolve(blockedRecruiterUser);
        case workerUserId:
          return Promise.resolve(workerUser);
        case adminUserId:
          return Promise.resolve(adminUser);
        default:
          return Promise.resolve(null);
      }
    });

    mockRecruiterProfileRepository.findByUserId.mockImplementation(
      (userId: string) => {
        if (userId === ownerUserId) {
          return Promise.resolve(ownerProfile);
        }
        if (userId === otherRecruiterUserId) {
          return Promise.resolve(otherProfile);
        }
        return Promise.resolve(null);
      },
    );

    mockJobPostRepository.findById.mockImplementation((id: string) => {
      if (id === ownerJobId) {
        return Promise.resolve(ownerJobPost);
      }
      return Promise.resolve(null);
    });

    mockJobApplicationRepository.findByJobPostId.mockResolvedValue(
      sampleRepositoryResult,
    );
  });

  describe('Authentication & Authorization', () => {
    it('returns 401 when no auth cookie is sent', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Authentication token is missing',
        data: null,
      });
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when auth cookie is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=invalid.token.value`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Invalid or expired token',
        data: null,
      });
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when recruiter user is blocked', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${blockedRecruiterToken}`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'User account is inactive or blocked',
        data: null,
      });
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when authenticated as WORKER', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [RECRUITER]',
        data: null,
      });
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when authenticated as ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${adminToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [RECRUITER]',
        data: null,
      });
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Param & Query Validation', () => {
    it('returns 400 when :id param is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/recruiter/jobs/not-a-uuid/applications')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 400 when unexpected query param such as recruiterId is provided', async () => {
      await request(app.getHttpServer())
        .get(
          `/recruiter/jobs/${ownerJobId}/applications?recruiterId=${otherRecruiterProfileId}`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid status, sortBy, page, or limit query params', async () => {
      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications?status=unknown`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications?sortBy=random`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications?page=0`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications?limit=51`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications?limit=0`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(400);

      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Ownership, Not Found & Happy Path', () => {
    it('returns 404 when authenticated recruiter profile is missing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${noProfileRecruiterToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Recruiter profile not found');
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 404 when job post does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${missingJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Job post not found');
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when another recruiter tries to view applicants and does not query applicants', async () => {
      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${otherRecruiterToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'You do not have permission to view applications for this job post',
      );
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).not.toHaveBeenCalled();
    });

    it('returns 404 if repository returns null after ownership check', async () => {
      mockJobApplicationRepository.findByJobPostId.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(
        mockJobApplicationRepository.findByJobPostId,
      ).toHaveBeenCalledTimes(1);
    });

    it('returns 200 with paginated applicants, summary, job info, and no PII for owning recruiter', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/recruiter/jobs/${ownerJobId}/applications?status=pending&search=%20Ada%20&page=1&limit=10&sortBy=expected_pay_asc`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(200);

      expect(mockRecruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
        ownerUserId,
      );
      expect(mockJobPostRepository.findById).toHaveBeenCalledWith(ownerJobId);
      expect(mockJobApplicationRepository.findByJobPostId).toHaveBeenCalledWith(
        {
          jobPostId: ownerJobId,
          status: JobApplicationStatus.PENDING,
          search: 'Ada',
          page: 1,
          limit: 10,
          sortBy: JobApplicationSortBy.EXPECTED_PAY_ASC,
        },
      );

      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.data).toEqual({
        job: {
          id: ownerJobId,
          title: 'Warehouse Lead',
          status: JobStatus.OPEN,
          workersNeeded: 2,
          workType: WorkType.LOCAL,
          paymentStructure: PaymentStructure.HOURLY,
          budgetAmount: null,
          hourlyRate: 25,
          acceptedCount: 1,
        },
        summary: {
          total: 1,
          pending: 1,
          shortlisted: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0,
        },
        items: [
          {
            id: 'app-uuid-1',
            jobPostId: ownerJobId,
            status: JobApplicationStatus.PENDING,
            expectedPay: 26,
            availableDate: '2026-11-20T00:00:00.000Z',
            appliedAt: '2026-11-11T10:00:00.000Z',
            updatedAt: '2026-11-11T10:00:00.000Z',
            worker: {
              id: 'worker-profile-uuid-1',
              firstName: 'Ada',
              lastName: 'Lovelace',
              location: 'Austin, TX',
              bio: 'Experienced team lead',
              headline: 'Logistics Coordinator',
              yearsExperience: 6,
              responseTimeHours: 1,
              availabilityStatus: 'AVAILABLE',
              isOpenToWork: true,
              totalCompletedGigs: 18,
              hasAvatar: true,
              skills: [
                {
                  id: 'skill-uuid-1',
                  name: 'Inventory Management',
                  skillType: 'primary',
                },
              ],
            },
            historySummary: {
              lastChangedAt: '2026-11-11T10:00:00.000Z',
              latestReasonCode: JobApplicationReasonCode.APPLIED,
              transitionCount: 1,
            },
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      const serialized = JSON.stringify(res.body.data);
      for (const forbiddenField of [
        'email',
        'phone',
        'passwordHash',
        'userId',
        'avatarUrl',
        'reasonNote',
        'changedByUserId',
        'metadata',
        'recruiterId',
        'adminNotes',
        'adminReviewStatus',
      ]) {
        expect(serialized).not.toContain(`"${forbiddenField}"`);
      }
    });

    it('defaults page=1, limit=10, sortBy=recent when query params are omitted', async () => {
      await request(app.getHttpServer())
        .get(`/recruiter/jobs/${ownerJobId}/applications`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(200);

      expect(mockJobApplicationRepository.findByJobPostId).toHaveBeenCalledWith(
        {
          jobPostId: ownerJobId,
          status: undefined,
          search: undefined,
          page: 1,
          limit: 10,
          sortBy: JobApplicationSortBy.RECENT,
        },
      );
    });

    it('keeps existing GET /recruiter/jobs route functional', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue({
        id: ownerRecruiterProfileId,
      } as never);
      getRecruiterJobPostsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      } as never);

      const res = await request(app.getHttpServer())
        .get('/recruiter/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /recruiter/jobs/:id/applications/:applicationId/{shortlist,accept,reject}', () => {
    const applicationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const updatedAt = new Date('2026-11-12T13:00:00.000Z');

    beforeEach(() => {
      mockRecruiterProfileRepository.findByUserId.mockImplementation(
        (id: string) => {
          if (id === ownerUserId) {
            return Promise.resolve(ownerProfile);
          }
          if (id === otherRecruiterUserId) {
            return Promise.resolve(otherProfile);
          }
          return Promise.resolve(null);
        },
      );
    });

    it('enforces authentication (401), recruiter role (403), and UUID path validation (400)', async () => {
      for (const action of ['shortlist', 'accept', 'reject']) {
        await request(app.getHttpServer())
          .patch(
            `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/${action}`,
          )
          .expect(401);

        await request(app.getHttpServer())
          .patch(
            `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/${action}`,
          )
          .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
          .expect(403);

        await request(app.getHttpServer())
          .patch(
            `/recruiter/jobs/not-a-uuid/applications/${applicationId}/${action}`,
          )
          .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
          .expect(400);

        await request(app.getHttpServer())
          .patch(
            `/recruiter/jobs/${ownerJobId}/applications/not-a-uuid/${action}`,
          )
          .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
          .expect(400);
      }

      expect(
        mockJobApplicationRepository.shortlistApplication,
      ).not.toHaveBeenCalled();
      expect(
        mockJobApplicationRepository.acceptApplication,
      ).not.toHaveBeenCalled();
      expect(
        mockJobApplicationRepository.rejectApplication,
      ).not.toHaveBeenCalled();
    });

    it('rejects non-whitelisted properties like recruiterId and over-long reasonNote with 400', async () => {
      await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/shortlist`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .send({ recruiterId: otherRecruiterProfileId })
        .expect(400);

      await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/reject`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .send({ reasonNote: 'a'.repeat(501) })
        .expect(400);
    });

    it('shortlists an applicant (200) and maps clean DTO without internal history details', async () => {
      mockJobApplicationRepository.shortlistApplication.mockResolvedValueOnce({
        application: new JobApplicationEntity({
          id: applicationId,
          jobPostId: ownerJobId,
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.SHORTLISTED,
          expectedPay: 30,
          availableDate: null,
          appliedAt: new Date('2026-11-11T10:00:00.000Z'),
          updatedAt,
        }),
        previousStatus: JobApplicationStatus.PENDING,
        jobStatus: JobStatus.OPEN,
      });

      const res = await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/shortlist`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .send({ reasonNote: '  Strong forklift skills  ' })
        .expect(200);

      expect(
        mockJobApplicationRepository.shortlistApplication,
      ).toHaveBeenCalledWith({
        jobPostId: ownerJobId,
        applicationId,
        recruiterId: ownerRecruiterProfileId,
        changedByUserId: ownerUserId,
        reasonNote: 'Strong forklift skills',
      });
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        applicationId,
        jobPostId: ownerJobId,
        status: JobApplicationStatus.SHORTLISTED,
        jobStatus: JobStatus.OPEN,
        updatedAt: updatedAt.toISOString(),
      });
      expect(res.body.data).not.toHaveProperty('reasonCode');
      expect(res.body.data).not.toHaveProperty('changedByUserId');
    });

    it('accepts an applicant and returns filled & autoRejectedCount payload cleanly', async () => {
      mockJobApplicationRepository.acceptApplication.mockResolvedValueOnce({
        application: new JobApplicationEntity({
          id: applicationId,
          jobPostId: ownerJobId,
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.ACCEPTED,
          expectedPay: 30,
          availableDate: null,
          appliedAt: new Date('2026-11-11T10:00:00.000Z'),
          updatedAt,
        }),
        previousStatus: JobApplicationStatus.SHORTLISTED,
        jobStatus: JobStatus.FILLED,
        workersNeeded: 2,
        acceptedCount: 2,
        jobFilled: true,
        autoRejectedCount: 4,
        autoRejectedApplicationIds: ['app-2', 'app-3', 'app-4', 'app-5'],
      });

      const res = await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/accept`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(200);

      expect(
        mockJobApplicationRepository.acceptApplication,
      ).toHaveBeenCalledWith({
        jobPostId: ownerJobId,
        applicationId,
        recruiterId: ownerRecruiterProfileId,
        changedByUserId: ownerUserId,
        reasonNote: null,
      });
      expect(res.body.data).toEqual({
        applicationId,
        jobPostId: ownerJobId,
        status: JobApplicationStatus.ACCEPTED,
        jobStatus: JobStatus.FILLED,
        workersNeeded: 2,
        acceptedCount: 2,
        jobFilled: true,
        autoRejectedCount: 4,
        updatedAt: updatedAt.toISOString(),
      });
      expect(res.body.data).not.toHaveProperty('autoRejectedApplicationIds');
    });

    it('rejects an applicant (200) cleanly with optional reasonNote', async () => {
      mockJobApplicationRepository.rejectApplication.mockResolvedValueOnce({
        application: new JobApplicationEntity({
          id: applicationId,
          jobPostId: ownerJobId,
          workerId: 'worker-profile-uuid-1',
          status: JobApplicationStatus.REJECTED,
          expectedPay: null,
          availableDate: null,
          appliedAt: new Date('2026-11-11T10:00:00.000Z'),
          updatedAt,
        }),
        previousStatus: JobApplicationStatus.PENDING,
        jobStatus: JobStatus.PAUSED,
      });

      const res = await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/reject`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .send({ reasonNote: 'Schedule mismatch' })
        .expect(200);

      expect(res.body.data).toEqual({
        applicationId,
        jobPostId: ownerJobId,
        status: JobApplicationStatus.REJECTED,
        jobStatus: JobStatus.PAUSED,
        updatedAt: updatedAt.toISOString(),
      });
    });

    it('maps missing profile/job/application (404), cross-recruiter access (403), and transitions/capacity conflicts (409)', async () => {
      await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/shortlist`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${noProfileRecruiterToken}`)
        .expect(404);

      mockJobApplicationRepository.acceptApplication.mockRejectedValueOnce(
        new ApplicationNotFoundError('Job application not found'),
      );
      await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${missingJobId}/applications/${applicationId}/accept`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(404);

      mockJobApplicationRepository.rejectApplication.mockRejectedValueOnce(
        new ApplicationAuthorizationError(
          'You do not have permission to manage applications for this job',
        ),
      );
      await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/reject`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${otherRecruiterToken}`)
        .expect(403);

      mockJobApplicationRepository.shortlistApplication.mockRejectedValueOnce(
        new ApplicationConflictError(
          'Cannot transition job application from "shortlisted" to "shortlisted"',
        ),
      );
      const invalidTransitionRes = await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/shortlist`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(409);
      expect(invalidTransitionRes.body.statusCode).toBe(409);

      mockJobApplicationRepository.acceptApplication.mockRejectedValueOnce(
        new ApplicationConflictError(
          'Job has already reached its hiring capacity',
        ),
      );
      const capacityRes = await request(app.getHttpServer())
        .patch(
          `/recruiter/jobs/${ownerJobId}/applications/${applicationId}/accept`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${ownerToken}`)
        .expect(409);
      expect(capacityRes.body.statusCode).toBe(409);
      expect(capacityRes.body.message).toBe(
        'Job has already reached its hiring capacity',
      );
    });
  });
});
