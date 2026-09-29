import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WorkerProfileController } from './worker-profile.controller';
import { IGetWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-profile.use-case.interface';
import { IUpdateWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-profile.use-case.interface';
import { IUpdateWorkerPersonalProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-personal-profile.use-case.interface';
import { IUploadWorkerAvatarUseCase } from '../../application/use-cases/worker-profile/interface/upload-worker-avatar.use-case.interface';
import { IGetWorkerAvatarUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-avatar.use-case.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { WorkerProfileResponseDto } from '../../application/dto/worker-profile/worker-profile-response.dto';
import { UpdateWorkerProfileInputDto } from '../../application/dto/worker-profile/update-worker-profile-input.dto';
import { UpdateWorkerPersonalProfileInputDto } from '../../application/dto/worker-profile/update-worker-personal-profile-input.dto';
import { UserResponseDto } from '../../application/dto/user/user-response.dto';
import { Role } from '../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('WorkerProfileController', () => {
  let controller: WorkerProfileController;
  let getWorkerProfileUseCase: jest.Mocked<IGetWorkerProfileUseCase>;
  let updateWorkerProfileUseCase: jest.Mocked<IUpdateWorkerProfileUseCase>;
  let updateWorkerPersonalProfileUseCase: jest.Mocked<IUpdateWorkerPersonalProfileUseCase>;
  let uploadWorkerAvatarUseCase: jest.Mocked<IUploadWorkerAvatarUseCase>;
  let getWorkerAvatarUseCase: jest.Mocked<IGetWorkerAvatarUseCase>;
  let reflector: Reflector;

  const mockResponseDto = new WorkerProfileResponseDto({
    id: 'worker-profile-uuid-1',
    userId: 'worker-user-uuid-1',
    headline: 'Senior Full Stack Engineer',
    yearsExperience: 7,
    responseTimeHours: 2,
    availabilityStatus: 'available',
    isOpenToWork: true,
    totalCompletedGigs: 18,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-15T00:00:00.000Z'),
  });

  const mockUserResponseDto = new UserResponseDto({
    id: 'worker-user-uuid-1',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Alex',
    lastName: 'Morgan',
    phone: '+1234567890',
    location: 'San Francisco, CA',
    bio: 'Experienced full stack developer',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    getWorkerProfileUseCase = {
      execute: jest.fn(),
    };

    updateWorkerProfileUseCase = {
      execute: jest.fn(),
    };

    updateWorkerPersonalProfileUseCase = {
      execute: jest.fn(),
    };

    uploadWorkerAvatarUseCase = {
      execute: jest.fn(),
    };

    getWorkerAvatarUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerProfileController],
      providers: [
        {
          provide: IGetWorkerProfileUseCase,
          useValue: getWorkerProfileUseCase,
        },
        {
          provide: IUpdateWorkerProfileUseCase,
          useValue: updateWorkerProfileUseCase,
        },
        {
          provide: IUpdateWorkerPersonalProfileUseCase,
          useValue: updateWorkerPersonalProfileUseCase,
        },
        {
          provide: IUploadWorkerAvatarUseCase,
          useValue: uploadWorkerAvatarUseCase,
        },
        {
          provide: IGetWorkerAvatarUseCase,
          useValue: getWorkerAvatarUseCase,
        },
        {
          provide: IUserRepository,
          useValue: { findById: jest.fn(), findByEmail: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<WorkerProfileController>(WorkerProfileController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Metadata & Security Constraints', () => {
    it('should have @Roles(Role.WORKER) configured on the controller class', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, WorkerProfileController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should have @Roles(Role.WORKER) configured on getProfile handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getProfile);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should have @Roles(Role.WORKER) configured on updateProfile handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.updateProfile);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should have @Roles(Role.WORKER) configured on updatePersonalProfile handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.updatePersonalProfile,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should have @Roles(Role.WORKER) configured on uploadAvatar handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.uploadAvatar);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should have @Roles(Role.WORKER) configured on getAvatar handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getAvatar);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('should apply JwtAuthGuard and RolesGuard to the controller class', () => {
      const guards = Reflect.getMetadata('__guards__', WorkerProfileController);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /worker/profile', () => {
    it('should extract authenticated user ID and return WorkerProfileResponseDto from use case', async () => {
      getWorkerProfileUseCase.execute.mockResolvedValue(mockResponseDto);

      const result = await controller.getProfile('worker-user-uuid-1');

      expect(getWorkerProfileUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
      );
      expect(result).toBe(mockResponseDto);
      expect(result.id).toBe('worker-profile-uuid-1');
      expect(result.userId).toBe('worker-user-uuid-1');
      expect(result.headline).toBe('Senior Full Stack Engineer');
    });

    it('should propagate NotFoundException when worker profile does not exist', async () => {
      getWorkerProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Worker profile not found'),
      );

      await expect(controller.getProfile('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getProfile('non-existent-user')).rejects.toThrow(
        'Worker profile not found',
      );
      expect(getWorkerProfileUseCase.execute).toHaveBeenCalledWith(
        'non-existent-user',
      );
    });
  });

  describe('PATCH /worker/profile', () => {
    it('should forward authenticated user ID and DTO to updateWorkerProfileUseCase', async () => {
      const updatedDto = new WorkerProfileResponseDto({
        ...mockResponseDto,
        headline: 'Lead Architect',
        yearsExperience: 9,
      });
      updateWorkerProfileUseCase.execute.mockResolvedValue(updatedDto);

      const inputDto: UpdateWorkerProfileInputDto = {
        headline: 'Lead Architect',
        yearsExperience: 9,
      };

      const result = await controller.updateProfile(
        'worker-user-uuid-1',
        inputDto,
      );

      expect(updateWorkerProfileUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
        inputDto,
      );
      expect(result).toBe(updatedDto);
      expect(result.headline).toBe('Lead Architect');
      expect(result.yearsExperience).toBe(9);
    });

    it('should enforce that user ID originates from authentication context and not body', async () => {
      updateWorkerProfileUseCase.execute.mockResolvedValue(mockResponseDto);

      const inputDto: UpdateWorkerProfileInputDto = {
        headline: 'Updated Headline',
      };

      await controller.updateProfile('authenticated-worker-id', inputDto);

      expect(updateWorkerProfileUseCase.execute).toHaveBeenCalledWith(
        'authenticated-worker-id',
        inputDto,
      );
    });

    it('should propagate use case errors to the presentation caller', async () => {
      updateWorkerProfileUseCase.execute.mockRejectedValue(
        new Error('Database write failure'),
      );

      const inputDto: UpdateWorkerProfileInputDto = {
        headline: 'Test Headline',
      };

      await expect(
        controller.updateProfile('worker-user-uuid-1', inputDto),
      ).rejects.toThrow('Database write failure');
    });
  });

  describe('PATCH /worker/profile/personal', () => {
    it('should forward authenticated user ID and DTO to updateWorkerPersonalProfileUseCase', async () => {
      updateWorkerPersonalProfileUseCase.execute.mockResolvedValue(
        mockUserResponseDto,
      );

      const inputDto: UpdateWorkerPersonalProfileInputDto = {
        firstName: 'Alex',
        lastName: 'Morgan',
        phone: '+1234567890',
        location: 'San Francisco, CA',
        bio: 'Experienced full stack developer',
      };

      const result = await controller.updatePersonalProfile(
        'worker-user-uuid-1',
        inputDto,
      );

      expect(updateWorkerPersonalProfileUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
        inputDto,
      );
      expect(result).toBe(mockUserResponseDto);
      expect(result.firstName).toBe('Alex');
      expect(result.lastName).toBe('Morgan');
      expect(result.phone).toBe('+1234567890');
      expect(result.location).toBe('San Francisco, CA');
      expect(result.bio).toBe('Experienced full stack developer');
    });

    it('should enforce that user ID originates from authentication context and not body', async () => {
      updateWorkerPersonalProfileUseCase.execute.mockResolvedValue(
        mockUserResponseDto,
      );

      const inputDto: UpdateWorkerPersonalProfileInputDto = {
        firstName: 'Updated First',
      };

      await controller.updatePersonalProfile(
        'authenticated-worker-id',
        inputDto,
      );

      expect(updateWorkerPersonalProfileUseCase.execute).toHaveBeenCalledWith(
        'authenticated-worker-id',
        inputDto,
      );
    });

    it('should propagate use case errors to the presentation caller', async () => {
      updateWorkerPersonalProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Worker user not found'),
      );

      const inputDto: UpdateWorkerPersonalProfileInputDto = {
        firstName: 'Test',
      };

      await expect(
        controller.updatePersonalProfile('worker-user-uuid-1', inputDto),
      ).rejects.toThrow('Worker user not found');
    });
  });

  describe('POST /worker/profile/avatar', () => {
    it('should forward authenticated userId and file to uploadWorkerAvatarUseCase', async () => {
      const mockResult = { avatarUrl: '/worker/profile/avatar' };
      uploadWorkerAvatarUseCase.execute.mockResolvedValueOnce(mockResult);

      const mockFile = {
        fieldname: 'file',
        originalname: 'profile.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('mock-png-data'),
      };

      const result = await controller.uploadAvatar('worker-user-123', mockFile);

      expect(result).toEqual(mockResult);
      expect(uploadWorkerAvatarUseCase.execute).toHaveBeenCalledWith({
        userId: 'worker-user-123',
        buffer: mockFile.buffer,
        mimetype: 'image/png',
        size: 1024,
      });
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        controller.uploadAvatar('worker-user-123', undefined),
      ).rejects.toThrow(BadRequestException);

      expect(uploadWorkerAvatarUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /worker/profile/avatar', () => {
    it('should retrieve avatar and stream response with appropriate headers', async () => {
      const mockFileResult = {
        buffer: Buffer.from('mock-avatar-bytes'),
        contentType: 'image/webp',
      };
      getWorkerAvatarUseCase.execute.mockResolvedValueOnce(mockFileResult);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getAvatar('worker-user-123', mockResponse);

      expect(getWorkerAvatarUseCase.execute).toHaveBeenCalledWith(
        'worker-user-123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/webp',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, max-age=3600',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockFileResult.buffer);
    });
  });

  describe('Part 12 — Security & RBAC Guard Evaluation', () => {
    let rolesGuard: RolesGuard;

    const createMockContext = (
      handler: (...args: unknown[]) => unknown,
      user?: { id: string; email: string; role?: Role },
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => WorkerProfileController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      rolesGuard = new RolesGuard(reflector);
    });

    it('No authentication: POST /worker/profile/avatar -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.uploadAvatar, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: GET /worker/profile/avatar -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getAvatar, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: PATCH /worker/profile/personal -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(
        controller.updatePersonalProfile,
        undefined,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('RECRUITER: POST /worker/profile/avatar -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.uploadAvatar, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER: GET /worker/profile/avatar -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getAvatar, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER: PATCH /worker/profile/personal -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updatePersonalProfile, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: POST /worker/profile/avatar -> allowed (returns true)', () => {
      const context = createMockContext(controller.uploadAvatar, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER: GET /worker/profile/avatar -> allowed (returns true)', () => {
      const context = createMockContext(controller.getAvatar, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER: PATCH /worker/profile/personal -> allowed (returns true)', () => {
      const context = createMockContext(controller.updatePersonalProfile, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
