import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JobDiscoveryController } from './job-discovery.controller';
import { IFindOpenJobsUseCase } from '../../application/use-cases/job-discovery/interface/find-open-jobs.use-case.interface';
import { IGetWorkerJobDetailsUseCase } from '../../application/use-cases/job-discovery/interface/get-worker-job-details.use-case.interface';
import { IReportJobUseCase } from '../../application/use-cases/job-discovery/interface/report-job.use-case.interface';
import { IApplyJobUseCase } from '../../application/use-cases/job-discovery/interface/apply-job.use-case.interface';
import { FindJobsQueryDto } from '../../application/dto/job-discovery/find-jobs-query.dto';
import {
  FindJobsResponseDto,
  JobDiscoveryItemDto,
  JobDiscoveryCompanyDto,
  PaginationMetadataDto,
} from '../../application/dto/job-discovery/find-jobs-response.dto';
import {
  WorkerJobDetailsResponseDto,
  WorkerJobDetailsCompanyDto,
  WorkerJobDetailsRecruiterDto,
} from '../../application/dto/job-discovery/worker-job-details-response.dto';
import { ReportJobInputDto } from '../../application/dto/job-discovery/report-job-input.dto';
import { ReportJobResponseDto } from '../../application/dto/job-discovery/report-job-response.dto';
import { ApplyJobInputDto } from '../../application/dto/job-discovery/apply-job-input.dto';
import { JobApplicationResponseDto } from '../../application/dto/job-discovery/job-application-response.dto';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { Role } from '../../domain/enums/role.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ITokenService } from '../../domain/services/token.service.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import { ConfigService } from '@nestjs/config';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../application/errors/application.errors';

describe('JobDiscoveryController', () => {
  let controller: JobDiscoveryController;
  let findOpenJobsUseCase: jest.Mocked<IFindOpenJobsUseCase>;
  let getWorkerJobDetailsUseCase: jest.Mocked<IGetWorkerJobDetailsUseCase>;
  let reportJobUseCase: jest.Mocked<IReportJobUseCase>;
  let applyJobUseCase: jest.Mocked<IApplyJobUseCase>;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockDetailsResponse = new WorkerJobDetailsResponseDto({
    id: '88888888-8888-4888-8888-888888888888',
    categoryId: 'c1111111-1111-4111-8111-111111111111',
    title: 'Warehouse Shift Helper',
    description: 'Help unload cartons from a delivery truck',
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
      { id: 's1', name: 'Heavy lifting' },
      { id: 's2', name: 'Punctuality' },
    ],
    company: new WorkerJobDetailsCompanyDto({
      id: 'comp-1',
      name: 'SwiftPack Storage',
      about: 'Leading storage provider',
      industry: 'Logistics',
      location: 'Seattle, WA',
      website: 'https://swiftpack.com',
      logoUrl: null,
    }),
    recruiter: new WorkerJobDetailsRecruiterDto({
      name: 'Sarah Jenkins',
      roleTitle: 'Senior Recruiter at SwiftPack Storage',
      location: 'Chicago, IL',
      bio: 'Experienced recruiter',
      avatarUrl: null,
      yearsExperience: 5,
    }),
  });

  const mockResponse = new FindJobsResponseDto({
    items: [
      new JobDiscoveryItemDto({
        id: 'job-1',
        categoryId: 'cat-1',
        title: 'Event Bartender',
        description: 'Wedding service',
        workType: WorkType.LOCAL,
        workersNeeded: 1,
        startDate: null,
        estimatedDuration: null,
        shiftDuration: null,
        jobLocation: 'Chicago, IL',
        jobLocationLat: null,
        jobLocationLng: null,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 35,
        status: JobStatus.OPEN,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        company: new JobDiscoveryCompanyDto({
          id: 'company-1',
          name: 'Apex Events',
          logoUrl: null,
        }),
      }),
    ],
    pagination: new PaginationMetadataDto({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  });

  beforeEach(async () => {
    findOpenJobsUseCase = {
      execute: jest.fn(),
    };
    getWorkerJobDetailsUseCase = {
      execute: jest.fn(),
    };
    reportJobUseCase = {
      execute: jest.fn(),
    };
    applyJobUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          provide: IApplyJobUseCase,
          useValue: applyJobUseCase,
        },
        {
          provide: IUserRepository,
          useValue: { findById: jest.fn(), findByEmail: jest.fn() },
        },
        {
          provide: ITokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            issueAccessToken: jest.fn(),
            issueRefreshToken: jest.fn(),
          },
        },
        {
          provide: AuthCookieService,
          useValue: {
            extractAccessToken: jest.fn(),
            extractRefreshToken: jest.fn(),
            setAuthCookies: jest.fn(),
            clearAuthCookies: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        Reflector,
        JwtAuthGuard,
        RolesGuard,
      ],
    }).compile();

    controller = module.get<JobDiscoveryController>(JobDiscoveryController);
    reflector = module.get<Reflector>(Reflector);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Metadata & Guard Constraints', () => {
    it('GET /worker/jobs: should have @Roles(Role.WORKER) configured on class or handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, JobDiscoveryController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('GET /worker/jobs: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', JobDiscoveryController);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /worker/jobs Handler Logic', () => {
    it('delegates to findOpenJobsUseCase with query DTO and returns response', async () => {
      findOpenJobsUseCase.execute.mockResolvedValue(mockResponse);

      const query = new FindJobsQueryDto({ search: 'Bartender' });
      const result = await controller.findJobs(query);

      expect(findOpenJobsUseCase.execute).toHaveBeenCalledWith(query);
      expect(findOpenJobsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('maps ApplicationValidationError to BadRequestException (400)', async () => {
      findOpenJobsUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('minPay cannot be greater than maxPay'),
      );

      await expect(controller.findJobs(new FindJobsQueryDto())).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findJobs(new FindJobsQueryDto())).rejects.toThrow(
        'minPay cannot be greater than maxPay',
      );
    });

    it('maps ApplicationNotFoundError to NotFoundException (404)', async () => {
      findOpenJobsUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Resource not found'),
      );

      await expect(controller.findJobs(new FindJobsQueryDto())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps ApplicationAuthorizationError to ForbiddenException (403)', async () => {
      findOpenJobsUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError('Not permitted'),
      );

      await expect(controller.findJobs(new FindJobsQueryDto())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rethrows unexpected database or system errors', async () => {
      findOpenJobsUseCase.execute.mockRejectedValue(
        new Error('Database connectivity error'),
      );

      await expect(controller.findJobs(new FindJobsQueryDto())).rejects.toThrow(
        'Database connectivity error',
      );
    });
  });

  describe('GET /worker/jobs/:id Handler Logic', () => {
    const validJobId = '88888888-8888-4888-8888-888888888888';

    it('delegates to getWorkerJobDetailsUseCase with id and returns details DTO', async () => {
      getWorkerJobDetailsUseCase.execute.mockResolvedValue(mockDetailsResponse);

      const result = await controller.getJobDetails(validJobId);

      expect(getWorkerJobDetailsUseCase.execute).toHaveBeenCalledWith(
        validJobId,
      );
      expect(getWorkerJobDetailsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDetailsResponse);
    });

    it('maps ApplicationNotFoundError to NotFoundException (404)', async () => {
      getWorkerJobDetailsUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found or is no longer open'),
      );

      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        'Job post not found or is no longer open',
      );
    });

    it('maps ApplicationValidationError to BadRequestException (400)', async () => {
      getWorkerJobDetailsUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('Job ID cannot be empty'),
      );

      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        'Job ID cannot be empty',
      );
    });

    it('maps ApplicationAuthorizationError to ForbiddenException (403)', async () => {
      getWorkerJobDetailsUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError('Worker profile not active'),
      );

      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rethrows unexpected database or system errors', async () => {
      getWorkerJobDetailsUseCase.execute.mockRejectedValue(
        new Error('Database connectivity error'),
      );

      await expect(controller.getJobDetails(validJobId)).rejects.toThrow(
        'Database connectivity error',
      );
    });
  });

  describe('reportJob', () => {
    const validJobId = '88888888-8888-4888-8888-888888888888';
    const reporterId = 'worker-uuid-1';
    const mockInputDto: ReportJobInputDto = {
      description: 'Fraudulent listing asking for wire transfer.',
    };
    const mockReportResponse: ReportJobResponseDto = {
      id: 'report-uuid-1',
      displayId: 'RPT-12345678',
      jobPostId: validJobId,
      status: 'pending',
      createdAt: new Date('2026-11-10T10:00:00Z'),
    };

    it('delegates to reportJobUseCase and returns public confirmation dto', async () => {
      reportJobUseCase.execute.mockResolvedValue(mockReportResponse);

      const result = await controller.reportJob(
        validJobId,
        reporterId,
        mockInputDto,
        undefined,
      );

      expect(reportJobUseCase.execute).toHaveBeenCalledWith({
        reporterId,
        jobPostId: validJobId,
        description: mockInputDto.description,
        evidenceFile: undefined,
      });
      expect(result).toEqual(mockReportResponse);
    });

    it('passes uploaded evidence file when provided', async () => {
      reportJobUseCase.execute.mockResolvedValue(mockReportResponse);
      const mockFile = {
        fieldname: 'evidence',
        originalname: 'proof.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-png-data'),
      };

      await controller.reportJob(
        validJobId,
        reporterId,
        mockInputDto,
        mockFile,
      );

      expect(reportJobUseCase.execute).toHaveBeenCalledWith({
        reporterId,
        jobPostId: validJobId,
        description: mockInputDto.description,
        evidenceFile: {
          buffer: mockFile.buffer,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          originalname: mockFile.originalname,
        },
      });
    });

    it('maps ApplicationValidationError to BadRequestException (400)', async () => {
      reportJobUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Description cannot exceed 500 characters',
        ),
      );

      await expect(
        controller.reportJob(validJobId, reporterId, mockInputDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps ApplicationNotFoundError to NotFoundException (404)', async () => {
      reportJobUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job not found'),
      );

      await expect(
        controller.reportJob(validJobId, reporterId, mockInputDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps ApplicationAuthorizationError to ForbiddenException (403)', async () => {
      reportJobUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError('Worker profile is suspended'),
      );

      await expect(
        controller.reportJob(validJobId, reporterId, mockInputDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('maps ApplicationConflictError to ConflictException (409)', async () => {
      reportJobUseCase.execute.mockRejectedValue(
        new ApplicationConflictError(
          'You already have a pending report for this job',
        ),
      );

      await expect(
        controller.reportJob(validJobId, reporterId, mockInputDto),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected errors', async () => {
      reportJobUseCase.execute.mockRejectedValue(
        new Error('Unexpected disk failure'),
      );

      await expect(
        controller.reportJob(validJobId, reporterId, mockInputDto),
      ).rejects.toThrow('Unexpected disk failure');
    });
  });

  describe('applyJob', () => {
    const validJobId = '77777777-7777-4777-8777-777777777777';
    const workerUserId = 'worker-uuid-123';
    const mockInputDto: ApplyJobInputDto = {
      expectedPay: 125.0,
      availableDate: '2099-10-15',
    };

    const mockResponseDto: JobApplicationResponseDto = {
      id: 'app-uuid-999',
      jobPostId: validJobId,
      status: JobApplicationStatus.PENDING,
      expectedPay: 125.0,
      availableDate: new Date('2099-10-15T00:00:00.000Z'),
      appliedAt: new Date('2026-11-11T12:00:00.000Z'),
      updatedAt: new Date('2026-11-11T12:00:00.000Z'),
    };

    it('delegates to applyJobUseCase.execute and returns created application DTO', async () => {
      applyJobUseCase.execute.mockResolvedValue(mockResponseDto);

      const result = await controller.applyJob(
        validJobId,
        workerUserId,
        mockInputDto,
      );

      expect(applyJobUseCase.execute).toHaveBeenCalledWith(
        workerUserId,
        validJobId,
        mockInputDto,
      );
      expect(result).toEqual(mockResponseDto);
    });

    it('handles omitted body gracefully', async () => {
      applyJobUseCase.execute.mockResolvedValue({
        ...mockResponseDto,
        expectedPay: null,
        availableDate: null,
      });

      const result = await controller.applyJob(
        validJobId,
        workerUserId,
        undefined,
      );

      expect(applyJobUseCase.execute).toHaveBeenCalledWith(
        workerUserId,
        validJobId,
        undefined,
      );
      expect(result.expectedPay).toBeNull();
      expect(result.availableDate).toBeNull();
    });

    it('maps ApplicationValidationError to BadRequestException (400)', async () => {
      applyJobUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('expectedPay must be greater than 0'),
      );

      await expect(
        controller.applyJob(validJobId, workerUserId, mockInputDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps ApplicationNotFoundError to NotFoundException (404)', async () => {
      applyJobUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(
        controller.applyJob(validJobId, workerUserId, mockInputDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps ApplicationAuthorizationError to ForbiddenException (403)', async () => {
      applyJobUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError('Worker account is restricted'),
      );

      await expect(
        controller.applyJob(validJobId, workerUserId, mockInputDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('maps ApplicationConflictError to ConflictException (409)', async () => {
      applyJobUseCase.execute.mockRejectedValue(
        new ApplicationConflictError('You have already applied for this job'),
      );

      await expect(
        controller.applyJob(validJobId, workerUserId, mockInputDto),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected errors', async () => {
      applyJobUseCase.execute.mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      await expect(
        controller.applyJob(validJobId, workerUserId, mockInputDto),
      ).rejects.toThrow('Unexpected database failure');
    });
  });

  describe('RBAC & Authorization Guard Evaluation', () => {
    const createMockContext = (
      handler: (...args: unknown[]) => unknown,
      user?: { id: string; email: string; role?: Role },
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => JobDiscoveryController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    it('Unauthenticated user (no session) throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.findJobs, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('RECRUITER role is rejected with ForbiddenException (403)', () => {
      const context = createMockContext(controller.findJobs, {
        id: 'recruiter-uuid',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('ADMIN role is rejected with ForbiddenException (403)', () => {
      const context = createMockContext(controller.findJobs, {
        id: 'admin-uuid',
        email: 'admin@example.com',
        role: Role.ADMIN,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER role is allowed access (returns true)', () => {
      const context = createMockContext(controller.findJobs, {
        id: 'worker-uuid',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
