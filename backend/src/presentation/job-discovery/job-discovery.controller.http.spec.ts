import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { JobDiscoveryController } from './job-discovery.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import {
  AuthCookieService,
  ACCESS_TOKEN_COOKIE_NAME,
} from '../auth/services/auth-cookie.service';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { IFindOpenJobsUseCase } from '../../application/use-cases/job-discovery/interface/find-open-jobs.use-case.interface';
import { IGetWorkerJobDetailsUseCase } from '../../application/use-cases/job-discovery/interface/get-worker-job-details.use-case.interface';
import { IReportJobUseCase } from '../../application/use-cases/job-discovery/interface/report-job.use-case.interface';
import {
  FindJobsResponseDto,
  JobDiscoveryItemDto,
  PaginationMetadataDto,
  JobDiscoveryCompanyDto,
} from '../../application/dto/job-discovery/find-jobs-response.dto';
import {
  WorkerJobDetailsResponseDto,
  WorkerJobDetailsCompanyDto,
  WorkerJobDetailsRecruiterDto,
} from '../../application/dto/job-discovery/worker-job-details-response.dto';
import { FindJobsQueryDto } from '../../application/dto/job-discovery/find-jobs-query.dto';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../application/errors/application.errors';
import { ITokenService } from '../../domain/services/token.service.interface';
import { JwtTokenService } from '../../infrastructure/security/jwt-token.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { Role } from '../../domain/enums/role.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { JobSortBy } from '../../domain/repositories/job-post.repository.interface';

describe('JobDiscoveryController (HTTP Pipeline Integration)', () => {
  let app: INestApplication;
  let findOpenJobsUseCase: { execute: jest.Mock };
  let getWorkerJobDetailsUseCase: { execute: jest.Mock };
  let reportJobUseCase: { execute: jest.Mock };
  let tokenService: JwtTokenService;

  let workerToken: string;
  let recruiterToken: string;
  let adminToken: string;
  let blockedWorkerToken: string;

  const workerUser = new UserEntities({
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'worker@example.com',
    passWordHash: 'hashedpassword',
    role: Role.WORKER,
    firstName: 'Worker',
    lastName: 'User',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const recruiterUser = new UserEntities({
    id: 'b0000000-0000-4000-8000-000000000002',
    email: 'recruiter@example.com',
    passWordHash: 'hashedpassword',
    role: Role.RECRUITER,
    firstName: 'Recruiter',
    lastName: 'User',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const adminUser = new UserEntities({
    id: 'c0000000-0000-4000-8000-000000000003',
    email: 'admin@example.com',
    passWordHash: 'hashedpassword',
    role: Role.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const blockedWorkerUser = new UserEntities({
    id: 'd0000000-0000-4000-8000-000000000004',
    email: 'blocked@example.com',
    passWordHash: 'hashedpassword',
    role: Role.WORKER,
    firstName: 'Blocked',
    lastName: 'Worker',
    isActive: true,
    isBlocked: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const sampleCompany = new JobDiscoveryCompanyDto({
    id: 'company-uuid-1',
    name: 'Apex Event Services',
    logoUrl: 'https://example.com/logo.png',
  });

  const sampleJobItemWithCompany = new JobDiscoveryItemDto({
    id: 'job-uuid-1',
    categoryId: 'c1111111-1111-4111-8111-111111111111',
    title: 'Lead Event Bartender',
    description: 'Provide bartending service at a private corporate gala.',
    workType: WorkType.LOCAL,
    workersNeeded: 2,
    startDate: new Date('2026-08-01T18:00:00.000Z'),
    estimatedDuration: '6 hours',
    shiftDuration: '6h',
    jobLocation: 'Dallas, TX',
    jobLocationLat: 32.7767,
    jobLocationLng: -96.797,
    paymentStructure: PaymentStructure.HOURLY,
    budgetAmount: null,
    hourlyRate: 35,
    status: JobStatus.OPEN,
    createdAt: new Date('2026-07-01T12:00:00.000Z'),
    category: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Hospitality',
      description: 'Hospitality jobs',
    },
    skills: [
      {
        id: 's1111111-1111-4111-8111-111111111111',
        name: 'Bartending',
      },
    ],
    company: sampleCompany,
  });

  const sampleJobItemWithoutCompany = new JobDiscoveryItemDto({
    id: 'job-uuid-2',
    categoryId: 'c1111111-1111-4111-8111-111111111111',
    title: 'Individual House Mover',
    description: 'Assist with loading furniture onto moving truck.',
    workType: WorkType.LOCAL,
    workersNeeded: 1,
    startDate: new Date('2026-08-05T09:00:00.000Z'),
    estimatedDuration: '4 hours',
    shiftDuration: '4h',
    jobLocation: 'Austin, TX',
    jobLocationLat: 30.2672,
    jobLocationLng: -97.7431,
    paymentStructure: PaymentStructure.FIXED,
    budgetAmount: 180,
    hourlyRate: null,
    status: JobStatus.OPEN,
    createdAt: new Date('2026-07-02T10:00:00.000Z'),
    category: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'General Labor',
      description: 'Physical labor jobs',
    },
    skills: [],
    company: null,
  });

  const sampleDefaultResponse = new FindJobsResponseDto({
    items: [sampleJobItemWithCompany],
    pagination: new PaginationMetadataDto({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  });

  const sampleJobDetails = new WorkerJobDetailsResponseDto({
    id: 'e0000000-0000-4000-8000-000000000001',
    categoryId: 'c1111111-1111-4111-8111-111111111111',
    title: 'Warehouse Shift Helper',
    description:
      'Help unload cartons from a delivery truck, sort stock by aisle, and move boxed items across a small warehouse floor.',
    workType: WorkType.LOCAL,
    workersNeeded: 4,
    startDate: new Date('2026-08-01T19:00:00.000Z'),
    estimatedDuration: 'Less than 1 day',
    shiftDuration: '6 hours',
    jobLocation: '2458 Harbor South Road, South Seattle',
    jobLocationLat: 47.58,
    jobLocationLng: -122.35,
    paymentStructure: PaymentStructure.FIXED,
    budgetAmount: 120,
    hourlyRate: null,
    status: JobStatus.OPEN,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    category: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Warehouse',
      description: 'Warehouse jobs',
    },
    skills: [
      { id: 's1111111-1111-4111-8111-111111111111', name: 'Heavy lifting' },
      { id: 's2222222-2222-4222-8222-222222222222', name: 'Punctuality' },
    ],
    company: new WorkerJobDetailsCompanyDto({
      id: 'company-uuid-1',
      name: 'SwiftPack Storage',
      about: 'Leading storage solutions',
      industry: 'Logistics',
      location: 'Seattle, WA',
      website: 'https://swiftpack.example.com',
      logoUrl: 'https://example.com/swiftpack-logo.png',
    }),
    recruiter: new WorkerJobDetailsRecruiterDto({
      name: 'Sarah Jenkins',
      roleTitle: 'Senior Recruiter at SwiftPack Storage',
      location: 'Chicago, IL',
      bio: 'Experienced recruiter specializing in logistics and event staffing.',
      avatarUrl: 'https://example.com/sarah-avatar.png',
      yearsExperience: 5,
    }),
  });

  beforeAll(async () => {
    const configMap: Record<string, string> = {
      JWT_SECRET: 'test-access-jwt-secret-key-32chars!',
      JWT_REFRESH_SECRET: 'test-refresh-jwt-secret-key-32ch!',
      JWT_ISSUER: 'gigly-auth',
      JWT_AUDIENCE: 'gigly-app',
      JWT_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      NODE_ENV: 'test',
    };

    const configService = {
      get: jest.fn((key: string) => configMap[key]),
    } as unknown as ConfigService;

    const jwtService = new JwtService();
    tokenService = new JwtTokenService(jwtService, configService);

    // Generate real cryptographically signed JWTs
    workerToken = await tokenService.issueAccessToken({
      sub: workerUser.id,
      email: workerUser.email,
      role: workerUser.role,
    });

    recruiterToken = await tokenService.issueAccessToken({
      sub: recruiterUser.id,
      email: recruiterUser.email,
      role: recruiterUser.role,
    });

    adminToken = await tokenService.issueAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    blockedWorkerToken = await tokenService.issueAccessToken({
      sub: blockedWorkerUser.id,
      email: blockedWorkerUser.email,
      role: blockedWorkerUser.role,
    });

    const userMap = new Map<string, UserEntities>([
      [workerUser.id, workerUser],
      [recruiterUser.id, recruiterUser],
      [adminUser.id, adminUser],
      [blockedWorkerUser.id, blockedWorkerUser],
    ]);

    const mockUserRepository = {
      findById: jest.fn((id: string) =>
        Promise.resolve(userMap.get(id) ?? null),
      ),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      updatePassword: jest.fn(),
    };

    findOpenJobsUseCase = {
      execute: jest.fn().mockImplementation((query: FindJobsQueryDto) => {
        if (
          query.minPay !== undefined &&
          query.maxPay !== undefined &&
          query.minPay > query.maxPay
        ) {
          return Promise.reject(
            new ApplicationValidationError(
              'minPay cannot be greater than maxPay',
            ),
          );
        }
        return Promise.resolve(sampleDefaultResponse);
      }),
    };

    getWorkerJobDetailsUseCase = {
      execute: jest.fn().mockResolvedValue(sampleJobDetails),
    };

    reportJobUseCase = {
      execute: jest.fn().mockImplementation(({ jobPostId }) => {
        return Promise.resolve({
          id: 'report-uuid-999',
          displayId: 'RPT-12345678',
          jobPostId,
          status: 'pending',
          createdAt: new Date('2026-11-10T10:00:00Z'),
        });
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [JobDiscoveryController],
      providers: [
        {
          provide: IFindOpenJobsUseCase,
          useValue: findOpenJobsUseCase,
        },
        {
          provide: IGetWorkerJobDetailsUseCase,
          useValue: getWorkerJobDetailsUseCase,
        },
        {
          provide: IReportJobUseCase,
          useValue: reportJobUseCase,
        },
        {
          provide: ITokenService,
          useValue: tokenService,
        },
        {
          provide: IUserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
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
    getWorkerJobDetailsUseCase.execute.mockResolvedValue(sampleJobDetails);
    reportJobUseCase.execute.mockImplementation(({ jobPostId }) => {
      return Promise.resolve({
        id: 'report-uuid-999',
        displayId: 'RPT-12345678',
        jobPostId,
        status: 'pending',
        createdAt: new Date('2026-11-10T10:00:00Z'),
      });
    });
    findOpenJobsUseCase.execute.mockImplementation(
      (query: FindJobsQueryDto) => {
        if (
          query.minPay !== undefined &&
          query.maxPay !== undefined &&
          query.minPay > query.maxPay
        ) {
          return Promise.reject(
            new ApplicationValidationError(
              'minPay cannot be greater than maxPay',
            ),
          );
        }
        return Promise.resolve(sampleDefaultResponse);
      },
    );
  });

  // =========================================================================
  // Category 1: Authentication & Authorization (HTTP Pipeline & Guards)
  // =========================================================================
  describe('Category 1: Authentication & Authorization', () => {
    it('1. Unauthenticated request without cookie returns 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Authentication token is missing',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('2. Invalid or malformed token cookie returns 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=malformed.jwt.token`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Invalid or expired token',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('3. Valid RECRUITER token returns 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${recruiterToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [WORKER]',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('4. Valid ADMIN token returns 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${adminToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [WORKER]',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('4b. Blocked WORKER user returns 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${blockedWorkerToken}`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'User account is inactive or blocked',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('5. Valid WORKER token allows access and returns 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(findOpenJobsUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Category 2: Query Validation (HTTP Level & ValidationPipe)
  // =========================================================================
  describe('Category 2: Query Validation', () => {
    it('6. ?page=0 returns 400 Bad Request (page must be >= 1)', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?page=0')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining(['page must be at least 1']),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('7. ?status=open returns 400 Bad Request (forbidNonWhitelisted strips unknown property)', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?status=open')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining(['property status should not exist']),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('8. Invalid category UUID returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?categoryId=not-a-valid-uuid')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining(['categoryId must be a valid UUID']),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('9. Invalid workType returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?workType=HYBRID')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining(['workType must be one of: local, remote']),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('10. Invalid paymentStructure returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?paymentStructure=COMMISSION')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          'paymentStructure must be one of: fixed, hourly',
        ]),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });

    it('11. minPay > maxPay triggers ApplicationValidationError and returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs?minPay=100&maxPay=50')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message: 'minPay cannot be greater than maxPay',
        data: null,
      });
      expect(findOpenJobsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('12. Repeated and comma-separated skillIds are normalized to array of UUIDs and passed to use case', async () => {
      const skill1 = 'a8b3e811-1234-4b45-9876-123456789abc';
      const skill2 = 'b9c4f922-2345-4c56-8901-234567890def';

      // Test comma-separated parameter
      await request(app.getHttpServer())
        .get(`/worker/jobs?skillIds=${skill1},${skill2}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(findOpenJobsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          skillIds: [skill1, skill2],
        }),
      );

      findOpenJobsUseCase.execute.mockClear();

      // Test repeated query parameters
      await request(app.getHttpServer())
        .get(`/worker/jobs?skillIds=${skill1}&skillIds=${skill2}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(findOpenJobsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          skillIds: [skill1, skill2],
        }),
      );
    });

    it('12b. Invalid skillIds (non-UUID) in comma-separated list returns 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/worker/jobs?skillIds=a8b3e811-1234-4b45-9876-123456789abc,not-a-uuid',
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toEqual(
        expect.arrayContaining(['Each skillId must be a valid UUID']),
      );
      expect(findOpenJobsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Category 3: Successful Response, Envelope, Pagination & Items
  // =========================================================================
  describe('Category 3: Successful Response & Enveloping', () => {
    it('13. Valid WORKER request with query filters passes normalized DTO to use case and returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/worker/jobs?search=Bartender&workType=${WorkType.LOCAL}&sortBy=pay_high&page=2&limit=20`,
        )
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);

      expect(findOpenJobsUseCase.execute).toHaveBeenCalledTimes(1);
      const passedQuery = findOpenJobsUseCase.execute.mock
        .calls[0][0] as FindJobsQueryDto;
      expect(passedQuery.search).toBe('Bartender');
      expect(passedQuery.workType).toBe(WorkType.LOCAL);
      expect(passedQuery.sortBy).toBe(JobSortBy.PAY_HIGH);
      expect(passedQuery.page).toBe(2);
      expect(passedQuery.limit).toBe(20);
    });

    it('14. Response is strictly enveloped by ResponseInterceptor', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        statusCode: 200,
        message: 'Request successful',
        data: {
          items: expect.any(Array),
          pagination: expect.any(Object),
        },
      });
    });

    it('15. Items and pagination metadata are preserved accurately', async () => {
      const detailedResponse = new FindJobsResponseDto({
        items: [sampleJobItemWithCompany],
        pagination: new PaginationMetadataDto({
          total: 45,
          page: 3,
          limit: 15,
          totalPages: 3,
        }),
      });

      findOpenJobsUseCase.execute.mockResolvedValueOnce(detailedResponse);

      const res = await request(app.getHttpServer())
        .get('/worker/jobs?page=3&limit=15')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.data.pagination).toEqual({
        total: 45,
        page: 3,
        limit: 15,
        totalPages: 3,
      });

      expect(res.body.data.items).toHaveLength(1);
      const item = res.body.data.items[0];
      expect(item.id).toBe('job-uuid-1');
      expect(item.title).toBe('Lead Event Bartender');
      expect(item.workType).toBe(WorkType.LOCAL);
      expect(item.paymentStructure).toBe(PaymentStructure.HOURLY);
      expect(item.hourlyRate).toBe(35);
      expect(item.category).toEqual({
        id: 'c1111111-1111-4111-8111-111111111111',
        name: 'Hospitality',
        description: 'Hospitality jobs',
      });
      expect(item.skills).toEqual([
        {
          id: 's1111111-1111-4111-8111-111111111111',
          name: 'Bartending',
        },
      ]);
      expect(item.company).toEqual({
        id: 'company-uuid-1',
        name: 'Apex Event Services',
        logoUrl: 'https://example.com/logo.png',
      });
    });

    it('16. Empty results are returned correctly with zero total and pages', async () => {
      const emptyResponse = new FindJobsResponseDto({
        items: [],
        pagination: new PaginationMetadataDto({
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }),
      });

      findOpenJobsUseCase.execute.mockResolvedValueOnce(emptyResponse);

      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('17. Company null is handled safely without errors and preserved in response', async () => {
      const responseWithNullCompany = new FindJobsResponseDto({
        items: [sampleJobItemWithoutCompany],
        pagination: new PaginationMetadataDto({
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      });

      findOpenJobsUseCase.execute.mockResolvedValueOnce(
        responseWithNullCompany,
      );

      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      const item = res.body.data.items[0];
      expect(item.id).toBe('job-uuid-2');
      expect(item.title).toBe('Individual House Mover');
      expect(item.company).toBeNull();
    });

    it('translates ApplicationNotFoundError to 404 NotFoundException', async () => {
      findOpenJobsUseCase.execute.mockRejectedValueOnce(
        new ApplicationNotFoundError('Category not found'),
      );

      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(404);

      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Category not found',
        data: null,
      });
    });

    it('translates ApplicationAuthorizationError to 403 ForbiddenException', async () => {
      findOpenJobsUseCase.execute.mockRejectedValueOnce(
        new ApplicationAuthorizationError('Worker profile incomplete'),
      );

      const res = await request(app.getHttpServer())
        .get('/worker/jobs')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message: 'Worker profile incomplete',
        data: null,
      });
    });
  });

  // =========================================================================
  // Category 4: GET /worker/jobs/:id (Single Job Details)
  // =========================================================================
  describe('Category 4: GET /worker/jobs/:id (Job Details)', () => {
    const validJobId = 'e0000000-0000-4000-8000-000000000001';

    it('18. Unauthenticated request without cookie returns 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Authentication token is missing',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('19. Invalid or malformed token cookie returns 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=malformed.jwt.token`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Invalid or expired token',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('20. Valid RECRUITER token returns 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${recruiterToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [WORKER]',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('21. Valid ADMIN token returns 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${adminToken}`)
        .expect(403);

      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message:
          'Forbidden resource. Requires one of the following roles: [WORKER]',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('22. Blocked WORKER user returns 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${blockedWorkerToken}`)
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'User account is inactive or blocked',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('23. Invalid non-UUID parameter returns 400 Bad Request via ParseUUIDPipe', async () => {
      const res = await request(app.getHttpServer())
        .get('/worker/jobs/not-a-valid-uuid')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain(
        'Validation failed (uuid is expected)',
      );
      expect(getWorkerJobDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it('24. Job not found or not in OPEN status returns 404 Not Found', async () => {
      getWorkerJobDetailsUseCase.execute.mockRejectedValueOnce(
        new ApplicationNotFoundError('Job post not found or is no longer open'),
      );

      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(404);

      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Job post not found or is no longer open',
        data: null,
      });
      expect(getWorkerJobDetailsUseCase.execute).toHaveBeenCalledWith(
        validJobId,
      );
    });

    it('25. Valid WORKER request returns 200 OK enveloped with complete public details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(getWorkerJobDetailsUseCase.execute).toHaveBeenCalledWith(
        validJobId,
      );

      expect(res.body).toEqual({
        success: true,
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: validJobId,
          categoryId: 'c1111111-1111-4111-8111-111111111111',
          title: 'Warehouse Shift Helper',
          description:
            'Help unload cartons from a delivery truck, sort stock by aisle, and move boxed items across a small warehouse floor.',
          workType: WorkType.LOCAL,
          workersNeeded: 4,
          startDate: '2026-08-01T19:00:00.000Z',
          estimatedDuration: 'Less than 1 day',
          shiftDuration: '6 hours',
          jobLocation: '2458 Harbor South Road, South Seattle',
          jobLocationLat: 47.58,
          jobLocationLng: -122.35,
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: 120,
          hourlyRate: null,
          status: JobStatus.OPEN,
          createdAt: '2026-08-01T12:00:00.000Z',
          category: {
            id: 'c1111111-1111-4111-8111-111111111111',
            name: 'Warehouse',
            description: 'Warehouse jobs',
          },
          skills: [
            {
              id: 's1111111-1111-4111-8111-111111111111',
              name: 'Heavy lifting',
            },
            {
              id: 's2222222-2222-4222-8222-222222222222',
              name: 'Punctuality',
            },
          ],
          company: {
            id: 'company-uuid-1',
            name: 'SwiftPack Storage',
            about: 'Leading storage solutions',
            industry: 'Logistics',
            location: 'Seattle, WA',
            website: 'https://swiftpack.example.com',
            logoUrl: 'https://example.com/swiftpack-logo.png',
          },
          recruiter: {
            name: 'Sarah Jenkins',
            roleTitle: 'Senior Recruiter at SwiftPack Storage',
            location: 'Chicago, IL',
            bio: 'Experienced recruiter specializing in logistics and event staffing.',
            avatarUrl: 'https://example.com/sarah-avatar.png',
            yearsExperience: 5,
          },
        },
      });
    });

    it('26. Security: strictly omits recruiter email, phone, and internal database/admin fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      const jobData = res.body.data;
      const recruiterData = jobData.recruiter;

      // Recruiter sensitive fields
      expect(recruiterData).not.toHaveProperty('email');
      expect(recruiterData).not.toHaveProperty('phone');
      expect(recruiterData).not.toHaveProperty('passWordHash');
      expect(recruiterData).not.toHaveProperty('userId');

      // Internal job post metadata & admin fields
      expect(jobData).not.toHaveProperty('recruiterId');
      expect(jobData).not.toHaveProperty('adminReviewStatus');
      expect(jobData).not.toHaveProperty('adminNotes');
      expect(jobData).not.toHaveProperty('isBoosted');
      expect(jobData).not.toHaveProperty('boostExpiresAt');
    });

    it('27. Gracefully handles null company, null recruiter, and optional null dates', async () => {
      const nullDetails = new WorkerJobDetailsResponseDto({
        id: validJobId,
        categoryId: 'c1111111-1111-4111-8111-111111111111',
        title: 'Solo Mover',
        description: 'Single helper needed',
        workType: WorkType.LOCAL,
        workersNeeded: 1,
        startDate: null,
        estimatedDuration: null,
        shiftDuration: null,
        jobLocation: 'Seattle, WA',
        jobLocationLat: null,
        jobLocationLng: null,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 25,
        status: JobStatus.OPEN,
        createdAt: new Date('2026-08-01T12:00:00.000Z'),
        category: null,
        skills: [],
        company: null,
        recruiter: null,
      });

      getWorkerJobDetailsUseCase.execute.mockResolvedValueOnce(nullDetails);

      const res = await request(app.getHttpServer())
        .get(`/worker/jobs/${validJobId}`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.company).toBeNull();
      expect(res.body.data.recruiter).toBeNull();
      expect(res.body.data.category).toBeNull();
      expect(res.body.data.startDate).toBeNull();
      expect(res.body.data.hourlyRate).toBe(25);
    });
  });

  describe('POST /worker/jobs/:id/report', () => {
    const validJobId = 'e0000000-0000-4000-8000-000000000001';

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .field('description', 'Inappropriate job posting')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token is missing');
    });

    it('rejects recruiter role with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${recruiterToken}`)
        .field('description', 'Inappropriate job posting')
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('rejects admin role with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${adminToken}`)
        .field('description', 'Inappropriate job posting')
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('rejects invalid UUID format with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/worker/jobs/not-a-valid-uuid/report')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Inappropriate job posting')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });

    it('rejects missing description with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('rejects whitespace-only description with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', '     ')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('accepts valid report submission without file and returns confirmation envelope', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Job post is demanding money upfront.')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        id: 'report-uuid-999',
        displayId: 'RPT-12345678',
        jobPostId: validJobId,
        status: 'pending',
        createdAt: expect.any(String),
      });

      expect(reportJobUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: workerUser.id,
          jobPostId: validJobId,
          description: 'Job post is demanding money upfront.',
          evidenceFile: undefined,
        }),
      );
    });

    it('accepts valid report submission with multipart evidence attachment', async () => {
      const fakePngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Evidence screenshot attached.')
        .attach('evidence', fakePngBuffer, 'screenshot.png')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('report-uuid-999');

      expect(reportJobUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: workerUser.id,
          jobPostId: validJobId,
          description: 'Evidence screenshot attached.',
          evidenceFile: expect.objectContaining({
            originalname: 'screenshot.png',
            mimetype: 'image/png',
          }),
        }),
      );
    });

    it('maps ApplicationNotFoundError to 404', async () => {
      reportJobUseCase.execute.mockRejectedValueOnce(
        new ApplicationNotFoundError('Job not found'),
      );

      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Non existent job')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job not found');
    });

    it('maps ApplicationConflictError to 409 Conflict', async () => {
      reportJobUseCase.execute.mockRejectedValueOnce(
        new ApplicationConflictError(
          'You already have a pending report for this job',
        ),
      );

      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Duplicate report')
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'You already have a pending report for this job',
      );
    });

    it('rejects oversized evidence file (> 5MB) at HTTP boundary with 413 Payload Too Large', async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);

      const res = await request(app.getHttpServer())
        .post(`/worker/jobs/${validJobId}/report`)
        .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${workerToken}`)
        .field('description', 'Oversized evidence attached.')
        .attach('evidence', oversizedBuffer, 'oversized.png')
        .expect(413);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(413);
      expect(res.body.message).toContain('File too large');
    });
  });
});
