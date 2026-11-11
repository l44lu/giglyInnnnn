import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ITokenService } from '../../domain/services/token.service.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import { JobPostingController } from './job-posting.controller';
import { IGetJobCategoriesUseCase } from '../../application/use-cases/job-posting/interface/get-job-categories.use-case.interface';
import { ICreateDraftJobPostUseCase } from '../../application/use-cases/job-posting/interface/create-draft-job-post.use-case.interface';
import { IPublishJobPostUseCase } from '../../application/use-cases/job-posting/interface/publish-job-post.use-case.interface';
import { IGetRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { IGetRecruiterJobPostsUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-posts.use-case.interface';
import { IGetRecruiterJobPostByIdUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-post-by-id.use-case.interface';
import { IUpdateJobPostUseCase } from '../../application/use-cases/job-posting/interface/update-job-post.use-case.interface';
import {
  ITransitionJobPostStatusUseCase,
  JobPostStatusAction,
} from '../../application/use-cases/job-posting/interface/transition-job-post-status.use-case.interface';
import { JobCategoryResponseDto } from '../../application/dto/job-posting/job-category-response.dto';
import { JobPostResponseDto } from '../../application/dto/job-posting/job-post-response.dto';
import { CreateDraftJobPostInputDto } from '../../application/dto/job-posting/create-draft-job-post-input.dto';
import { UpdateJobPostInputDto } from '../../application/dto/job-posting/update-job-post-input.dto';
import {
  GetRecruiterJobsQueryDto,
  RecruiterJobStatusFilter,
} from '../../application/dto/job-posting/get-recruiter-jobs-query.dto';
import {
  GetRecruiterJobPostsResponseDto,
  RecruiterJobPostsSummaryDto,
} from '../../application/dto/job-posting/recruiter-job-posts-response.dto';
import { RecruiterProfileResponseDto } from '../../application/dto/recruiter-profile/recruiter-profile-response.dto';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { Role } from '../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from '../../application/errors/application.errors';

describe('JobPostingController', () => {
  let controller: JobPostingController;
  let getJobCategoriesUseCase: jest.Mocked<IGetJobCategoriesUseCase>;
  let getRecruiterProfileUseCase: jest.Mocked<IGetRecruiterProfileUseCase>;
  let createDraftJobPostUseCase: jest.Mocked<ICreateDraftJobPostUseCase>;
  let publishJobPostUseCase: jest.Mocked<IPublishJobPostUseCase>;
  let getRecruiterJobPostsUseCase: jest.Mocked<IGetRecruiterJobPostsUseCase>;
  let getRecruiterJobPostByIdUseCase: jest.Mocked<IGetRecruiterJobPostByIdUseCase>;
  let updateJobPostUseCase: jest.Mocked<IUpdateJobPostUseCase>;
  let transitionJobPostStatusUseCase: jest.Mocked<ITransitionJobPostStatusUseCase>;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockUserId = 'user-uuid-1';
  const mockRecruiterProfileId = 'recruiter-profile-uuid-1';
  const mockJobId = '123e4567-e89b-42d3-a456-426614174000';

  const mockRecruiterProfile = new RecruiterProfileResponseDto({
    id: mockRecruiterProfileId,
    userId: mockUserId,
    companyId: null,
    roleTitle: 'Hiring Manager',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockCategories: JobCategoryResponseDto[] = [
    new JobCategoryResponseDto({
      id: 'category-uuid-1',
      name: 'Events & Hospitality',
      description: 'Event hosting and hospitality staffing',
    }),
    new JobCategoryResponseDto({
      id: 'category-uuid-2',
      name: 'Warehousing & Logistics',
      description: null,
    }),
  ];

  const mockDraftJobResponse = new JobPostResponseDto({
    id: mockJobId,
    recruiterId: mockRecruiterProfileId,
    categoryId: 'category-uuid-1',
    title: 'Event Coordinator',
    description: 'Looking for an event coordinator.',
    workType: WorkType.LOCAL,
    workersNeeded: 2,
    paymentStructure: PaymentStructure.HOURLY,
    status: JobStatus.DRAFT,
    adminReviewStatus: 'pending',
    isBoosted: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  });

  const mockPublishedJobResponse = new JobPostResponseDto({
    ...mockDraftJobResponse,
    status: JobStatus.OPEN,
    updatedAt: new Date('2026-06-02T00:00:00.000Z'),
  });

  const mockPausedJobResponse = new JobPostResponseDto({
    ...mockPublishedJobResponse,
    status: JobStatus.PAUSED,
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  });

  const mockClosedJobResponse = new JobPostResponseDto({
    ...mockPublishedJobResponse,
    status: JobStatus.CANCELLED,
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  });

  const mockRecruiterJobsResponse = new GetRecruiterJobPostsResponseDto({
    summary: new RecruiterJobPostsSummaryDto({
      total: 2,
      active: 1,
      draft: 1,
      paused: 0,
      closed: 0,
      activeLocal: 1,
      activeRemote: 0,
    }),
    items: [mockPublishedJobResponse, mockDraftJobResponse],
  });

  const validDraftDto: CreateDraftJobPostInputDto = {
    categoryId: 'category-uuid-1',
    title: 'Event Coordinator',
    description: 'Looking for an event coordinator.',
    workType: WorkType.LOCAL,
    workersNeeded: 2,
    paymentStructure: PaymentStructure.HOURLY,
  };

  const validUpdateDto: UpdateJobPostInputDto = new UpdateJobPostInputDto({
    categoryId: 'category-uuid-1',
    title: 'Senior Event Coordinator',
    description: 'Updated description for event coordinator.',
    workType: WorkType.LOCAL,
    workersNeeded: 3,
    paymentStructure: PaymentStructure.HOURLY,
    hourlyRate: 40,
    jobLocation: 'Chicago, IL',
    skillIds: ['123e4567-e89b-42d3-a456-426614174001'],
  });

  const mockUpdatedJobResponse = new JobPostResponseDto({
    ...mockDraftJobResponse,
    title: 'Senior Event Coordinator',
    description: 'Updated description for event coordinator.',
    workersNeeded: 3,
    hourlyRate: 40,
    jobLocation: 'Chicago, IL',
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  });

  beforeEach(async () => {
    getJobCategoriesUseCase = {
      execute: jest.fn(),
    };

    getRecruiterProfileUseCase = {
      execute: jest.fn(),
    };

    createDraftJobPostUseCase = {
      execute: jest.fn(),
    };

    publishJobPostUseCase = {
      execute: jest.fn(),
    };

    getRecruiterJobPostsUseCase = {
      execute: jest.fn(),
    };

    getRecruiterJobPostByIdUseCase = {
      execute: jest.fn(),
    };

    updateJobPostUseCase = {
      execute: jest.fn(),
    };

    transitionJobPostStatusUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
        {
          provide: IPublishJobPostUseCase,
          useValue: publishJobPostUseCase,
        },
        {
          provide: IGetRecruiterJobPostsUseCase,
          useValue: getRecruiterJobPostsUseCase,
        },
        {
          provide: IGetRecruiterJobPostByIdUseCase,
          useValue: getRecruiterJobPostByIdUseCase,
        },
        {
          provide: IUpdateJobPostUseCase,
          useValue: updateJobPostUseCase,
        },
        {
          provide: ITransitionJobPostStatusUseCase,
          useValue: transitionJobPostStatusUseCase,
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
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        AuthCookieService,
        Reflector,
      ],
    }).compile();

    controller = module.get<JobPostingController>(JobPostingController);
    reflector = module.get<Reflector>(Reflector);
    rolesGuard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Metadata & Security Constraints', () => {
    it('GET /job-categories: should be public with no @Roles decorator', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.getJobCategories,
      );
      expect(roles).toBeUndefined();
    });

    it('GET /job-categories: should have no guards applied', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.getJobCategories,
      );
      expect(guards).toBeUndefined();
    });

    it('GET /recruiter/jobs: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.getRecruiterJobs,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('GET /recruiter/jobs: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.getRecruiterJobs,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('POST /recruiter/jobs/draft: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.createDraft);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('POST /recruiter/jobs/draft: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.createDraft);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PATCH /recruiter/jobs/:id/publish: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.publishJob);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('PATCH /recruiter/jobs/:id/publish: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.publishJob);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('GET /recruiter/jobs/:id: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.getRecruiterJobById,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('GET /recruiter/jobs/:id: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.getRecruiterJobById,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PATCH /recruiter/jobs/:id: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.updateJob);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('PATCH /recruiter/jobs/:id: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.updateJob);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PATCH /recruiter/jobs/:id/pause: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.pauseJob);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('PATCH /recruiter/jobs/:id/pause: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.pauseJob);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PATCH /recruiter/jobs/:id/reopen: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.reopenJob);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('PATCH /recruiter/jobs/:id/reopen: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.reopenJob);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PATCH /recruiter/jobs/:id/close: should have @Roles(Role.RECRUITER) configured on handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.closeJob);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('PATCH /recruiter/jobs/:id/close: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.closeJob);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /job-categories', () => {
    it('returns categories list from use case', async () => {
      getJobCategoriesUseCase.execute.mockResolvedValue(mockCategories);

      const result = await controller.getJobCategories();

      expect(getJobCategoriesUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockCategories);
    });

    it('returns empty array when no categories exist', async () => {
      getJobCategoriesUseCase.execute.mockResolvedValue([]);

      const result = await controller.getJobCategories();

      expect(result).toEqual([]);
    });

    it('maps ApplicationValidationError to BadRequestException', async () => {
      getJobCategoriesUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('Validation failed'),
      );

      await expect(controller.getJobCategories()).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getJobCategories()).rejects.toThrow(
        'Validation failed',
      );
    });

    it('maps ApplicationNotFoundError to NotFoundException', async () => {
      getJobCategoriesUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Category catalog not found'),
      );

      await expect(controller.getJobCategories()).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getJobCategories()).rejects.toThrow(
        'Category catalog not found',
      );
    });

    it('rethrows unexpected errors', async () => {
      const dbError = new Error('Database connection lost');
      getJobCategoriesUseCase.execute.mockRejectedValue(dbError);

      await expect(controller.getJobCategories()).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  describe('GET /recruiter/jobs', () => {
    it('resolves user ID to RecruiterProfile ID and returns all postings when query is omitted', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      const result = await controller.getRecruiterJobs(
        mockUserId,
        undefined as any,
      );

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        undefined,
      );
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRecruiterJobsResponse);
      expect(result.summary.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('passes active status query parameter to the use case', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      const query = new GetRecruiterJobsQueryDto({
        status: RecruiterJobStatusFilter.ACTIVE,
      });

      const result = await controller.getRecruiterJobs(mockUserId, query);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        query,
      );
      expect(result).toEqual(mockRecruiterJobsResponse);
    });

    it('passes draft, paused, and closed filters correctly to the use case', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      const filters = [
        RecruiterJobStatusFilter.DRAFT,
        RecruiterJobStatusFilter.PAUSED,
        RecruiterJobStatusFilter.CLOSED,
      ];

      for (const filter of filters) {
        const query = new GetRecruiterJobsQueryDto({ status: filter });
        await controller.getRecruiterJobs(mockUserId, query);

        expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
          mockRecruiterProfileId,
          query,
        );
      }
    });

    it('defaults omitted status to "all" in query DTO', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      const query = new GetRecruiterJobsQueryDto();
      expect(query.status).toBe(RecruiterJobStatusFilter.ALL);

      await controller.getRecruiterJobs(mockUserId, query);

      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        query,
      );
    });

    it('maps ApplicationValidationError to BadRequestException for invalid status filter', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Invalid status filter: unsupported_status',
        ),
      );

      const query = {
        status: 'unsupported_status' as any,
      } as GetRecruiterJobsQueryDto;

      await expect(
        controller.getRecruiterJobs(mockUserId, query),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getRecruiterJobs(mockUserId, query),
      ).rejects.toThrow('Invalid status filter: unsupported_status');
    });

    it('resolves authenticated User ID to RecruiterProfile ID before calling use case', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      await controller.getRecruiterJobs(
        mockUserId,
        new GetRecruiterJobsQueryDto(),
      );

      // Verifies the use case is called with the resolved profile ID, NOT the User ID
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        expect.any(GetRecruiterJobsQueryDto),
      );
      expect(getRecruiterJobPostsUseCase.execute).not.toHaveBeenCalledWith(
        mockUserId,
        expect.anything(),
      );
    });

    it('ensures client cannot supply or override recruiter ID (derives recruiter ID from session)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockResolvedValue(
        mockRecruiterJobsResponse,
      );

      // Attempting to pass spoofed recruiter ID inside query object has no effect on profile resolution
      const queryWithSpoofedId = {
        status: RecruiterJobStatusFilter.ALL,
        recruiterId: 'spoofed-recruiter-id',
      } as any;

      await controller.getRecruiterJobs(mockUserId, queryWithSpoofedId);

      // Must call getRecruiterProfileUseCase strictly with authenticated session userId
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      // Must call getRecruiterJobPostsUseCase strictly with verified profile ID
      expect(getRecruiterJobPostsUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        queryWithSpoofedId,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow('Recruiter profile not found');

      expect(getRecruiterJobPostsUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Recruiter jobs catalog not found'),
      );

      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow('Recruiter jobs catalog not found');
    });

    it('maps ApplicationAuthorizationError to ForbiddenException', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostsUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError('Recruiter account is restricted'),
      );

      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow('Recruiter account is restricted');
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const systemError = new Error('Database connection reset');
      getRecruiterJobPostsUseCase.execute.mockRejectedValue(systemError);

      await expect(
        controller.getRecruiterJobs(mockUserId, new GetRecruiterJobsQueryDto()),
      ).rejects.toThrow('Database connection reset');
    });
  });

  describe('POST /recruiter/jobs/draft', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to createDraftJobPostUseCase', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      createDraftJobPostUseCase.execute.mockResolvedValue(mockDraftJobResponse);

      const result = await controller.createDraft(mockUserId, validDraftDto);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(createDraftJobPostUseCase.execute).toHaveBeenCalledWith(
        mockRecruiterProfileId,
        validDraftDto,
      );
      expect(result).toEqual(mockDraftJobResponse);
      expect(result.id).toBe(mockJobId);
      expect(result.recruiterId).toBe(mockRecruiterProfileId);
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow('Recruiter profile not found');

      expect(createDraftJobPostUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationValidationError to BadRequestException', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      createDraftJobPostUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('Job title cannot be empty'),
      );

      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow('Job title cannot be empty');
    });

    it('maps ApplicationNotFoundError to NotFoundException', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      createDraftJobPostUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job category not found'),
      );

      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow('Job category not found');
    });

    it('maps ApplicationAuthorizationError to ForbiddenException', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      createDraftJobPostUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'Recruiter profile is not authorized to create gigs',
        ),
      );

      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow('Recruiter profile is not authorized to create gigs');
    });

    it('rethrows unexpected database/system errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const systemError = new Error('Disk write failed');
      createDraftJobPostUseCase.execute.mockRejectedValue(systemError);

      await expect(
        controller.createDraft(mockUserId, validDraftDto),
      ).rejects.toThrow('Disk write failed');
    });
  });

  describe('PATCH /recruiter/jobs/:id/publish', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to publishJobPostUseCase', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      publishJobPostUseCase.execute.mockResolvedValue(mockPublishedJobResponse);

      const result = await controller.publishJob(mockJobId, mockUserId);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(publishJobPostUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
      );
      expect(result).toEqual(mockPublishedJobResponse);
      expect(result.status).toBe(JobStatus.OPEN);
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow('Recruiter profile not found');

      expect(publishJobPostUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationAuthorizationError to ForbiddenException when recruiter does not own the job post', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      publishJobPostUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to publish this job post',
        ),
      );

      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow('You do not have permission to publish this job post');
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      publishJobPostUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow('Job post not found');
    });

    it('maps ApplicationValidationError to BadRequestException for draft validation failure', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      publishJobPostUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Only draft job posts can be published. Current status: open',
        ),
      );

      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow(
        'Only draft job posts can be published. Current status: open',
      );
    });

    it('rethrows unexpected errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const dbError = new Error('Database transaction abort');
      publishJobPostUseCase.execute.mockRejectedValue(dbError);

      await expect(
        controller.publishJob(mockJobId, mockUserId),
      ).rejects.toThrow('Database transaction abort');
    });
  });

  describe('GET /recruiter/jobs/:id', () => {
    it('resolves user ID to RecruiterProfile ID and returns mapped job post', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostByIdUseCase.execute.mockResolvedValue(
        mockDraftJobResponse,
      );

      const result = await controller.getRecruiterJobById(
        mockJobId,
        mockUserId,
      );

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(getRecruiterJobPostByIdUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
      );
      expect(getRecruiterJobPostByIdUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDraftJobResponse);
    });

    it('verifies arguments passed to use case: uses resolved recruiter profile ID instead of user ID', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostByIdUseCase.execute.mockResolvedValue(
        mockDraftJobResponse,
      );

      await controller.getRecruiterJobById(mockJobId, mockUserId);

      expect(getRecruiterJobPostByIdUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
      );
      expect(getRecruiterJobPostByIdUseCase.execute).not.toHaveBeenCalledWith(
        mockJobId,
        mockUserId,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow('Recruiter profile not found');

      expect(getRecruiterJobPostByIdUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found (404)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostByIdUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow('Job post not found');
    });

    it('maps ApplicationAuthorizationError to ForbiddenException on ownership mismatch (403)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostByIdUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to view this job post',
        ),
      );

      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow('You do not have permission to view this job post');
    });

    it('maps ApplicationValidationError to BadRequestException on validation failure (400)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      getRecruiterJobPostByIdUseCase.execute.mockRejectedValue(
        new ApplicationValidationError('Job post ID is required'),
      );

      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow('Job post ID is required');
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const systemError = new Error('Database connection failed');
      getRecruiterJobPostByIdUseCase.execute.mockRejectedValue(systemError);

      await expect(
        controller.getRecruiterJobById(mockJobId, mockUserId),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('PATCH /recruiter/jobs/:id', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to updateJobPostUseCase', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      updateJobPostUseCase.execute.mockResolvedValue(mockUpdatedJobResponse);

      const result = await controller.updateJob(
        mockJobId,
        mockUserId,
        validUpdateDto,
      );

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(updateJobPostUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        validUpdateDto,
      );
      expect(updateJobPostUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUpdatedJobResponse);
    });

    it('verifies arguments passed to use case: uses resolved recruiter profile ID instead of user ID', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      updateJobPostUseCase.execute.mockResolvedValue(mockUpdatedJobResponse);

      await controller.updateJob(mockJobId, mockUserId, validUpdateDto);

      expect(updateJobPostUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        validUpdateDto,
      );
      expect(updateJobPostUseCase.execute).not.toHaveBeenCalledWith(
        mockJobId,
        mockUserId,
        validUpdateDto,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow('Recruiter profile not found');

      expect(updateJobPostUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found (404)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      updateJobPostUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow('Job post not found');
    });

    it('maps ApplicationAuthorizationError to ForbiddenException on ownership mismatch (403)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      updateJobPostUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to modify this job post',
        ),
      );

      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow('You do not have permission to modify this job post');
    });

    it('maps ApplicationValidationError to BadRequestException on business rule violation (400)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      updateJobPostUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Published job with fixed payment must have budgetAmount > 0',
        ),
      );

      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow(
        'Published job with fixed payment must have budgetAmount > 0',
      );
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const dbError = new Error('Database transaction abort');
      updateJobPostUseCase.execute.mockRejectedValue(dbError);

      await expect(
        controller.updateJob(mockJobId, mockUserId, validUpdateDto),
      ).rejects.toThrow('Database transaction abort');
    });
  });

  describe('PATCH /recruiter/jobs/:id/pause', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to transitionJobPostStatusUseCase with PAUSE', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockPausedJobResponse,
      );

      const result = await controller.pauseJob(mockJobId, mockUserId);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.PAUSE,
      );
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPausedJobResponse);
    });

    it('verifies arguments passed to use case: uses resolved recruiter profile ID instead of user ID', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockPausedJobResponse,
      );

      await controller.pauseJob(mockJobId, mockUserId);

      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.PAUSE,
      );
      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalledWith(
        mockJobId,
        mockUserId,
        JobPostStatusAction.PAUSE,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        'Recruiter profile not found',
      );

      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found (404)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        'Job post not found',
      );
    });

    it('maps ApplicationAuthorizationError to ForbiddenException on ownership mismatch (403)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to modify this job post',
        ),
      );

      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        'You do not have permission to modify this job post',
      );
    });

    it('maps ApplicationValidationError to BadRequestException on invalid status transition (400)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Cannot pause job post with status DRAFT. Only OPEN jobs can be paused.',
        ),
      );

      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        'Cannot pause job post with status DRAFT. Only OPEN jobs can be paused.',
      );
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const dbError = new Error('Database connection failed');
      transitionJobPostStatusUseCase.execute.mockRejectedValue(dbError);

      await expect(controller.pauseJob(mockJobId, mockUserId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('PATCH /recruiter/jobs/:id/reopen', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to transitionJobPostStatusUseCase with REOPEN', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockPublishedJobResponse,
      );

      const result = await controller.reopenJob(mockJobId, mockUserId);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.REOPEN,
      );
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPublishedJobResponse);
    });

    it('verifies arguments passed to use case: uses resolved recruiter profile ID instead of user ID', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockPublishedJobResponse,
      );

      await controller.reopenJob(mockJobId, mockUserId);

      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.REOPEN,
      );
      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalledWith(
        mockJobId,
        mockUserId,
        JobPostStatusAction.REOPEN,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        'Recruiter profile not found',
      );

      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found (404)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        'Job post not found',
      );
    });

    it('maps ApplicationAuthorizationError to ForbiddenException on ownership mismatch (403)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to modify this job post',
        ),
      );

      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        'You do not have permission to modify this job post',
      );
    });

    it('maps ApplicationValidationError to BadRequestException on invalid status transition (400)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Cannot reopen job post with status OPEN. Only PAUSED jobs can be reopened.',
        ),
      );

      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        'Cannot reopen job post with status OPEN. Only PAUSED jobs can be reopened.',
      );
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const dbError = new Error('Database connection failed');
      transitionJobPostStatusUseCase.execute.mockRejectedValue(dbError);

      await expect(controller.reopenJob(mockJobId, mockUserId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('PATCH /recruiter/jobs/:id/close', () => {
    it('resolves user ID to RecruiterProfile ID and delegates to transitionJobPostStatusUseCase with CLOSE', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockClosedJobResponse,
      );

      const result = await controller.closeJob(mockJobId, mockUserId);

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledTimes(1);
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.CLOSE,
      );
      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockClosedJobResponse);
    });

    it('verifies arguments passed to use case: uses resolved recruiter profile ID instead of user ID', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockResolvedValue(
        mockClosedJobResponse,
      );

      await controller.closeJob(mockJobId, mockUserId);

      expect(transitionJobPostStatusUseCase.execute).toHaveBeenCalledWith(
        mockJobId,
        mockRecruiterProfileId,
        JobPostStatusAction.CLOSE,
      );
      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalledWith(
        mockJobId,
        mockUserId,
        JobPostStatusAction.CLOSE,
      );
    });

    it('propagates NotFoundException from getRecruiterProfileUseCase when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        'Recruiter profile not found',
      );

      expect(transitionJobPostStatusUseCase.execute).not.toHaveBeenCalled();
    });

    it('maps ApplicationNotFoundError to NotFoundException when job post is not found (404)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationNotFoundError('Job post not found'),
      );

      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        'Job post not found',
      );
    });

    it('maps ApplicationAuthorizationError to ForbiddenException on ownership mismatch (403)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationAuthorizationError(
          'You do not have permission to modify this job post',
        ),
      );

      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        'You do not have permission to modify this job post',
      );
    });

    it('maps ApplicationValidationError to BadRequestException on invalid status transition (400)', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      transitionJobPostStatusUseCase.execute.mockRejectedValue(
        new ApplicationValidationError(
          'Cannot close job post with status DRAFT. Only OPEN or PAUSED jobs can be closed.',
        ),
      );

      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        'Cannot close job post with status DRAFT. Only OPEN or PAUSED jobs can be closed.',
      );
    });

    it('rethrows unexpected system/database errors', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(
        mockRecruiterProfile,
      );
      const dbError = new Error('Database connection failed');
      transitionJobPostStatusUseCase.execute.mockRejectedValue(dbError);

      await expect(controller.closeJob(mockJobId, mockUserId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('ValidationPipe & Protected Field Protection for PATCH /recruiter/jobs/:id', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const validPayload = {
      categoryId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Valid Senior Bartender',
      description: 'Valid job description with enough details.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      hourlyRate: 30,
      workersNeeded: 2,
    };

    it('accepts and transforms a valid update payload', async () => {
      const transformed = await pipe.transform(validPayload, {
        type: 'body',
        metatype: UpdateJobPostInputDto,
      });

      expect(transformed).toBeInstanceOf(UpdateJobPostInputDto);
      expect(transformed.title).toBe('Valid Senior Bartender');
      expect(transformed.workersNeeded).toBe(2);
    });

    it('rejects invalid update input with missing required fields (e.g. title)', async () => {
      const invalidPayload = {
        categoryId: '123e4567-e89b-42d3-a456-426614174000',
        description: 'Missing title description',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
      };

      await expect(
        pipe.transform(invalidPayload, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid update input with invalid workType enum value', async () => {
      const invalidPayload = {
        ...validPayload,
        workType: 'INVALID_WORK_TYPE',
      };

      await expect(
        pipe.transform(invalidPayload, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid update input with invalid paymentStructure enum value', async () => {
      const invalidPayload = {
        ...validPayload,
        paymentStructure: 'INVALID_PAYMENT',
      };

      await expect(
        pipe.transform(invalidPayload, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid workersNeeded (< 1)', async () => {
      const invalidPayload = {
        ...validPayload,
        workersNeeded: 0,
      };

      await expect(
        pipe.transform(invalidPayload, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects protected field: id', async () => {
      const payloadWithId = {
        ...validPayload,
        id: '123e4567-e89b-42d3-a456-426614174999',
      };

      await expect(
        pipe.transform(payloadWithId, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithId, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain('property id should not exist');
      }
    });

    it('rejects protected field: recruiterId', async () => {
      const payloadWithRecruiterId = {
        ...validPayload,
        recruiterId: 'recruiter-profile-uuid-2',
      };

      await expect(
        pipe.transform(payloadWithRecruiterId, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithRecruiterId, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property recruiterId should not exist',
        );
      }
    });

    it('rejects protected field: status', async () => {
      const payloadWithStatus = {
        ...validPayload,
        status: JobStatus.OPEN,
      };

      await expect(
        pipe.transform(payloadWithStatus, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithStatus, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property status should not exist',
        );
      }
    });

    it('rejects protected field: createdAt', async () => {
      const payloadWithCreatedAt = {
        ...validPayload,
        createdAt: new Date().toISOString(),
      };

      await expect(
        pipe.transform(payloadWithCreatedAt, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithCreatedAt, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property createdAt should not exist',
        );
      }
    });

    it('rejects protected field: isBoosted', async () => {
      const payloadWithBoost = {
        ...validPayload,
        isBoosted: true,
      };

      await expect(
        pipe.transform(payloadWithBoost, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithBoost, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property isBoosted should not exist',
        );
      }
    });

    it('rejects protected field: boostExpiresAt', async () => {
      const payloadWithBoostExpires = {
        ...validPayload,
        boostExpiresAt: new Date().toISOString(),
      };

      await expect(
        pipe.transform(payloadWithBoostExpires, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithBoostExpires, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property boostExpiresAt should not exist',
        );
      }
    });

    it('rejects protected field: adminReviewStatus', async () => {
      const payloadWithAdmin = {
        ...validPayload,
        adminReviewStatus: 'APPROVED',
      };

      await expect(
        pipe.transform(payloadWithAdmin, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithAdmin, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property adminReviewStatus should not exist',
        );
      }
    });

    it('rejects protected field: adminNotes', async () => {
      const payloadWithAdminNotes = {
        ...validPayload,
        adminNotes: 'malicious note modification',
      };

      await expect(
        pipe.transform(payloadWithAdminNotes, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(payloadWithAdminNotes, {
          type: 'body',
          metatype: UpdateJobPostInputDto,
        });
      } catch (err: any) {
        expect(err.response.message).toContain(
          'property adminNotes should not exist',
        );
      }
    });
  });

  describe('Route Param UUID Validation', () => {
    const uuidPipe = new ParseUUIDPipe();

    it('accepts a valid UUID for :id param', async () => {
      const result = await uuidPipe.transform(mockJobId, {
        type: 'param',
        data: 'id',
      });
      expect(result).toBe(mockJobId);
    });

    it('rejects non-UUID for :id param with BadRequestException (400)', async () => {
      await expect(
        uuidPipe.transform('invalid-non-uuid-string', {
          type: 'param',
          data: 'id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RBAC & Authorization Guard Evaluation', () => {
    const createMockContext = (
      handler: (...args: unknown[]) => unknown,
      user?: { id: string; email: string; role?: Role },
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => JobPostingController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    describe('GET /job-categories (Public authorization)', () => {
      it('Unauthenticated: allows access (returns true)', () => {
        const context = createMockContext(
          controller.getJobCategories,
          undefined,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('WORKER: allows access (returns true)', () => {
        const context = createMockContext(controller.getJobCategories, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.getJobCategories, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('ADMIN: allows access (returns true)', () => {
        const context = createMockContext(controller.getJobCategories, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('GET /recruiter/jobs (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(
          controller.getRecruiterJobs,
          undefined,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getRecruiterJobs, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getRecruiterJobs, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.getRecruiterJobs, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('POST /recruiter/jobs/draft (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.createDraft, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.createDraft, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.createDraft, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.createDraft, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PATCH /recruiter/jobs/:id/publish (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.publishJob, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.publishJob, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.publishJob, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.publishJob, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('GET /recruiter/jobs/:id (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(
          controller.getRecruiterJobById,
          undefined,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getRecruiterJobById, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getRecruiterJobById, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.getRecruiterJobById, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PATCH /recruiter/jobs/:id (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.updateJob, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.updateJob, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.updateJob, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.updateJob, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PATCH /recruiter/jobs/:id/pause (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.pauseJob, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.pauseJob, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.pauseJob, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.pauseJob, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PATCH /recruiter/jobs/:id/reopen (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.reopenJob, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.reopenJob, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.reopenJob, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.reopenJob, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PATCH /recruiter/jobs/:id/close (RECRUITER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(controller.closeJob, undefined);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('WORKER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.closeJob, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.closeJob, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.closeJob, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });
});
