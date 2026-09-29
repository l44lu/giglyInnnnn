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
import { RecruiterProfileController } from './recruiter-profile.controller';
import { IGetRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { IUpdateRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-profile.use-case.interface';
import { IUpdateRecruiterPersonalProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-personal-profile.use-case.interface';
import { IUploadRecruiterAvatarUseCase } from '../../application/use-cases/recruiter-profile/interface/upload-recruiter-avatar.use-case.interface';
import { IGetRecruiterAvatarUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-avatar.use-case.interface';
import { IGetRecruiterCompanyUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-company.use-case.interface';
import { IUpdateRecruiterCompanyUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-company.use-case.interface';
import { IUploadRecruiterCompanyLogoUseCase } from '../../application/use-cases/recruiter-profile/interface/upload-recruiter-company-logo.use-case.interface';
import { IGetRecruiterCompanyLogoUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-company-logo.use-case.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { RecruiterProfileResponseDto } from '../../application/dto/recruiter-profile/recruiter-profile-response.dto';
import { UpdateRecruiterProfileInputDto } from '../../application/dto/recruiter-profile/update-recruiter-profile-input.dto';
import { UpdateRecruiterPersonalProfileInputDto } from '../../application/dto/recruiter-profile/update-recruiter-personal-profile-input.dto';
import { CompanyResponseDto } from '../../application/dto/recruiter-profile/company-response.dto';
import { UpdateCompanyInputDto } from '../../application/dto/recruiter-profile/update-company-input.dto';
import { UserResponseDto } from '../../application/dto/user/user-response.dto';
import { Role } from '../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('RecruiterProfileController', () => {
  let controller: RecruiterProfileController;
  let getRecruiterProfileUseCase: jest.Mocked<IGetRecruiterProfileUseCase>;
  let updateRecruiterProfileUseCase: jest.Mocked<IUpdateRecruiterProfileUseCase>;
  let updateRecruiterPersonalProfileUseCase: jest.Mocked<IUpdateRecruiterPersonalProfileUseCase>;
  let uploadRecruiterAvatarUseCase: jest.Mocked<IUploadRecruiterAvatarUseCase>;
  let getRecruiterAvatarUseCase: jest.Mocked<IGetRecruiterAvatarUseCase>;
  let getRecruiterCompanyUseCase: jest.Mocked<IGetRecruiterCompanyUseCase>;
  let updateRecruiterCompanyUseCase: jest.Mocked<IUpdateRecruiterCompanyUseCase>;
  let uploadRecruiterCompanyLogoUseCase: jest.Mocked<IUploadRecruiterCompanyLogoUseCase>;
  let getRecruiterCompanyLogoUseCase: jest.Mocked<IGetRecruiterCompanyLogoUseCase>;
  let reflector: Reflector;

  const mockResponseDto = new RecruiterProfileResponseDto({
    id: 'recruiter-profile-uuid-1',
    userId: 'recruiter-user-uuid-1',
    companyId: 'company-uuid-1',
    roleTitle: 'Technical Recruiter',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-15T00:00:00.000Z'),
  });

  const mockCompanyResponseDto = new CompanyResponseDto({
    id: 'company-uuid-1',
    name: 'Acme Corp',
    industry: 'Technology',
    companySize: '50-100',
    website: 'https://acme.example.com',
    headquartersLocation: 'New York, NY',
    about: 'Leading technology solutions.',
    logoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-15T00:00:00.000Z'),
  });

  const mockUserResponseDto = new UserResponseDto({
    id: 'recruiter-user-uuid-1',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Alex',
    lastName: 'Morgan',
    phone: '+1234567890',
    location: 'San Francisco, CA',
    bio: 'Experienced Technical Recruiter',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    getRecruiterProfileUseCase = {
      execute: jest.fn(),
    };

    updateRecruiterProfileUseCase = {
      execute: jest.fn(),
    };

    updateRecruiterPersonalProfileUseCase = {
      execute: jest.fn(),
    };

    uploadRecruiterAvatarUseCase = {
      execute: jest.fn(),
    };

    getRecruiterAvatarUseCase = {
      execute: jest.fn(),
    };

    getRecruiterCompanyUseCase = {
      execute: jest.fn(),
    };

    updateRecruiterCompanyUseCase = {
      execute: jest.fn(),
    };

    uploadRecruiterCompanyLogoUseCase = {
      execute: jest.fn(),
    };

    getRecruiterCompanyLogoUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruiterProfileController],
      providers: [
        {
          provide: IGetRecruiterProfileUseCase,
          useValue: getRecruiterProfileUseCase,
        },
        {
          provide: IUpdateRecruiterProfileUseCase,
          useValue: updateRecruiterProfileUseCase,
        },
        {
          provide: IUpdateRecruiterPersonalProfileUseCase,
          useValue: updateRecruiterPersonalProfileUseCase,
        },
        {
          provide: IUploadRecruiterAvatarUseCase,
          useValue: uploadRecruiterAvatarUseCase,
        },
        {
          provide: IGetRecruiterAvatarUseCase,
          useValue: getRecruiterAvatarUseCase,
        },
        {
          provide: IGetRecruiterCompanyUseCase,
          useValue: getRecruiterCompanyUseCase,
        },
        {
          provide: IUpdateRecruiterCompanyUseCase,
          useValue: updateRecruiterCompanyUseCase,
        },
        {
          provide: IUploadRecruiterCompanyLogoUseCase,
          useValue: uploadRecruiterCompanyLogoUseCase,
        },
        {
          provide: IGetRecruiterCompanyLogoUseCase,
          useValue: getRecruiterCompanyLogoUseCase,
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

    controller = module.get<RecruiterProfileController>(
      RecruiterProfileController,
    );
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Metadata & Security Constraints', () => {
    it('should have @Roles(Role.RECRUITER) configured on the controller class', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        RecruiterProfileController,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.RECRUITER]);
    });

    it('should apply JwtAuthGuard and RolesGuard to the controller class', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        RecruiterProfileController,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /recruiter/profile', () => {
    it('should extract authenticated user ID and return RecruiterProfileResponseDto from use case', async () => {
      getRecruiterProfileUseCase.execute.mockResolvedValue(mockResponseDto);

      const result = await controller.getProfile('recruiter-user-uuid-1');

      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-uuid-1',
      );
      expect(result).toBe(mockResponseDto);
      expect(result.id).toBe('recruiter-profile-uuid-1');
      expect(result.userId).toBe('recruiter-user-uuid-1');
      expect(result.roleTitle).toBe('Technical Recruiter');
    });

    it('should propagate NotFoundException when recruiter profile does not exist', async () => {
      getRecruiterProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter profile not found'),
      );

      await expect(controller.getProfile('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getProfile('non-existent-user')).rejects.toThrow(
        'Recruiter profile not found',
      );
      expect(getRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        'non-existent-user',
      );
    });
  });

  describe('PATCH /recruiter/profile', () => {
    it('should forward authenticated user ID and DTO to updateRecruiterProfileUseCase', async () => {
      const updatedDto = new RecruiterProfileResponseDto({
        ...mockResponseDto,
        roleTitle: 'Lead Talent Partner',
        yearsExperience: 7,
      });
      updateRecruiterProfileUseCase.execute.mockResolvedValue(updatedDto);

      const inputDto: UpdateRecruiterProfileInputDto = {
        roleTitle: 'Lead Talent Partner',
        yearsExperience: 7,
      };

      const result = await controller.updateProfile(
        'recruiter-user-uuid-1',
        inputDto,
      );

      expect(updateRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-uuid-1',
        inputDto,
      );
      expect(result).toBe(updatedDto);
      expect(result.roleTitle).toBe('Lead Talent Partner');
      expect(result.yearsExperience).toBe(7);
    });

    it('should enforce that user ID originates from authentication context and not body', async () => {
      updateRecruiterProfileUseCase.execute.mockResolvedValue(mockResponseDto);

      const inputDto: UpdateRecruiterProfileInputDto = {
        roleTitle: 'Updated Title',
      };

      await controller.updateProfile('authenticated-recruiter-id', inputDto);

      expect(updateRecruiterProfileUseCase.execute).toHaveBeenCalledWith(
        'authenticated-recruiter-id',
        inputDto,
      );
    });

    it('should propagate use case errors to the presentation caller', async () => {
      updateRecruiterProfileUseCase.execute.mockRejectedValue(
        new Error('Database write failure'),
      );

      const inputDto: UpdateRecruiterProfileInputDto = {
        roleTitle: 'Test Title',
      };

      await expect(
        controller.updateProfile('recruiter-user-uuid-1', inputDto),
      ).rejects.toThrow('Database write failure');
    });
  });

  describe('PATCH /recruiter/profile/personal', () => {
    it('should forward authenticated user ID and DTO to updateRecruiterPersonalProfileUseCase', async () => {
      updateRecruiterPersonalProfileUseCase.execute.mockResolvedValue(
        mockUserResponseDto,
      );

      const inputDto: UpdateRecruiterPersonalProfileInputDto = {
        firstName: 'Alex',
        lastName: 'Morgan',
        phone: '+1234567890',
        location: 'San Francisco, CA',
        bio: 'Experienced Technical Recruiter',
      };

      const result = await controller.updatePersonalProfile(
        'recruiter-user-uuid-1',
        inputDto,
      );

      expect(
        updateRecruiterPersonalProfileUseCase.execute,
      ).toHaveBeenCalledWith('recruiter-user-uuid-1', inputDto);
      expect(result).toBe(mockUserResponseDto);
      expect(result.firstName).toBe('Alex');
      expect(result.lastName).toBe('Morgan');
      expect(result.phone).toBe('+1234567890');
      expect(result.location).toBe('San Francisco, CA');
      expect(result.bio).toBe('Experienced Technical Recruiter');
    });

    it('should propagate use case errors to the presentation caller', async () => {
      updateRecruiterPersonalProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('Recruiter user not found'),
      );

      const inputDto: UpdateRecruiterPersonalProfileInputDto = {
        firstName: 'Test',
      };

      await expect(
        controller.updatePersonalProfile('recruiter-user-uuid-1', inputDto),
      ).rejects.toThrow('Recruiter user not found');
    });
  });

  describe('POST /recruiter/profile/avatar', () => {
    it('should forward authenticated userId and file to uploadRecruiterAvatarUseCase', async () => {
      const mockResult = { avatarUrl: '/recruiter/profile/avatar' };
      uploadRecruiterAvatarUseCase.execute.mockResolvedValueOnce(mockResult);

      const mockFile = {
        fieldname: 'file',
        originalname: 'profile.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('mock-png-data'),
      };

      const result = await controller.uploadAvatar(
        'recruiter-user-123',
        mockFile,
      );

      expect(result).toEqual(mockResult);
      expect(uploadRecruiterAvatarUseCase.execute).toHaveBeenCalledWith({
        userId: 'recruiter-user-123',
        buffer: mockFile.buffer,
        mimetype: 'image/png',
        size: 1024,
      });
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        controller.uploadAvatar('recruiter-user-123', undefined),
      ).rejects.toThrow(BadRequestException);

      expect(uploadRecruiterAvatarUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /recruiter/profile/avatar', () => {
    it('should retrieve avatar and stream response with appropriate headers', async () => {
      const mockFileResult = {
        buffer: Buffer.from('mock-avatar-bytes'),
        contentType: 'image/webp',
      };
      getRecruiterAvatarUseCase.execute.mockResolvedValueOnce(mockFileResult);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getAvatar('recruiter-user-123', mockResponse);

      expect(getRecruiterAvatarUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-123',
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

  describe('GET /recruiter/company', () => {
    it('should call getRecruiterCompanyUseCase with authenticated user ID and return CompanyResponseDto', async () => {
      getRecruiterCompanyUseCase.execute.mockResolvedValue(
        mockCompanyResponseDto,
      );

      const result = await controller.getCompany('recruiter-user-uuid-1');

      expect(getRecruiterCompanyUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-uuid-1',
      );
      expect(result).toBe(mockCompanyResponseDto);
      expect(result.id).toBe('company-uuid-1');
      expect(result.name).toBe('Acme Corp');
    });

    it('should propagate NotFoundException when company is not configured or not found', async () => {
      getRecruiterCompanyUseCase.execute.mockRejectedValue(
        new NotFoundException(
          'Company profile not configured for this recruiter',
        ),
      );

      await expect(
        controller.getCompany('recruiter-user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getCompany('recruiter-user-uuid-1'),
      ).rejects.toThrow('Company profile not configured for this recruiter');
    });

    it('should strictly use authenticated userId from context and not accept client-supplied identifiers', async () => {
      getRecruiterCompanyUseCase.execute.mockResolvedValue(
        mockCompanyResponseDto,
      );

      await controller.getCompany('authenticated-session-user-id');

      expect(getRecruiterCompanyUseCase.execute).toHaveBeenCalledWith(
        'authenticated-session-user-id',
      );
      expect(getRecruiterCompanyUseCase.execute).not.toHaveBeenCalledWith(
        'client-supplied-target',
      );
    });
  });

  describe('PATCH /recruiter/company', () => {
    it('should call updateRecruiterCompanyUseCase with authenticated user ID and DTO', async () => {
      const updatedCompany = new CompanyResponseDto({
        ...mockCompanyResponseDto,
        name: 'Acme Global Corp',
        industry: 'FinTech',
      });
      updateRecruiterCompanyUseCase.execute.mockResolvedValue(updatedCompany);

      const inputDto: UpdateCompanyInputDto = {
        name: 'Acme Global Corp',
        industry: 'FinTech',
      };

      const result = await controller.updateCompany(
        'recruiter-user-uuid-1',
        inputDto,
      );

      expect(updateRecruiterCompanyUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-uuid-1',
        inputDto,
      );
      expect(result).toBe(updatedCompany);
      expect(result.name).toBe('Acme Global Corp');
      expect(result.industry).toBe('FinTech');
    });

    it('should propagate validation and application errors from use case', async () => {
      updateRecruiterCompanyUseCase.execute.mockRejectedValue(
        new BadRequestException(
          'Company name is required to create a company profile',
        ),
      );

      const inputDto: UpdateCompanyInputDto = {
        industry: 'FinTech',
      };

      await expect(
        controller.updateCompany('recruiter-user-uuid-1', inputDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateCompany('recruiter-user-uuid-1', inputDto),
      ).rejects.toThrow('Company name is required to create a company profile');
    });

    it('should delegate target identification entirely to use case and not use companyId from request', async () => {
      updateRecruiterCompanyUseCase.execute.mockResolvedValue(
        mockCompanyResponseDto,
      );

      const inputDto: UpdateCompanyInputDto = {
        name: 'Company Update',
      };

      await controller.updateCompany('authenticated-recruiter-id', inputDto);

      expect(updateRecruiterCompanyUseCase.execute).toHaveBeenCalledWith(
        'authenticated-recruiter-id',
        inputDto,
      );
    });
  });

  describe('POST /recruiter/company/logo', () => {
    it('should forward authenticated userId and file to uploadRecruiterCompanyLogoUseCase', async () => {
      const mockResult = { logoUrl: '/recruiter/company/logo' };
      uploadRecruiterCompanyLogoUseCase.execute.mockResolvedValueOnce(
        mockResult,
      );

      const mockFile = {
        fieldname: 'file',
        originalname: 'company-logo.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('mock-company-logo-png-data'),
      };

      const result = await controller.uploadCompanyLogo(
        'recruiter-user-123',
        mockFile,
      );

      expect(result).toEqual(mockResult);
      expect(uploadRecruiterCompanyLogoUseCase.execute).toHaveBeenCalledWith({
        userId: 'recruiter-user-123',
        buffer: mockFile.buffer,
        mimetype: 'image/png',
        size: 2048,
      });
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        controller.uploadCompanyLogo('recruiter-user-123', undefined),
      ).rejects.toThrow(BadRequestException);

      expect(uploadRecruiterCompanyLogoUseCase.execute).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException when company profile is not configured', async () => {
      uploadRecruiterCompanyLogoUseCase.execute.mockRejectedValue(
        new NotFoundException(
          'Company profile not configured for this recruiter',
        ),
      );

      const mockFile = {
        fieldname: 'file',
        originalname: 'company-logo.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('mock-data'),
      };

      await expect(
        controller.uploadCompanyLogo('recruiter-user-123', mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should strictly derive company ownership from authenticated userId and not accept payload companyId', async () => {
      uploadRecruiterCompanyLogoUseCase.execute.mockResolvedValue({
        logoUrl: '/recruiter/company/logo',
      });

      const mockFile = {
        fieldname: 'file',
        originalname: 'company-logo.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('mock-data'),
      };

      await controller.uploadCompanyLogo(
        'authenticated-session-user-id',
        mockFile,
      );

      expect(uploadRecruiterCompanyLogoUseCase.execute).toHaveBeenCalledWith({
        userId: 'authenticated-session-user-id',
        buffer: mockFile.buffer,
        mimetype: 'image/png',
        size: 2048,
      });
      expect(
        uploadRecruiterCompanyLogoUseCase.execute,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({ companyId: expect.anything() }),
      );
    });
  });

  describe('GET /recruiter/company/logo', () => {
    it('should retrieve company logo and stream response with appropriate headers', async () => {
      const mockFileResult = {
        buffer: Buffer.from('mock-company-logo-bytes'),
        contentType: 'image/png',
      };
      getRecruiterCompanyLogoUseCase.execute.mockResolvedValueOnce(
        mockFileResult,
      );

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getCompanyLogo('recruiter-user-123', mockResponse);

      expect(getRecruiterCompanyLogoUseCase.execute).toHaveBeenCalledWith(
        'recruiter-user-123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/png',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, max-age=3600',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockFileResult.buffer);
    });

    it('should propagate NotFoundException when company has no logo configured', async () => {
      getRecruiterCompanyLogoUseCase.execute.mockRejectedValue(
        new NotFoundException('No logo found for this company'),
      );

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.getCompanyLogo('recruiter-user-123', mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should strictly derive company ownership from authenticated userId', async () => {
      getRecruiterCompanyLogoUseCase.execute.mockResolvedValue({
        buffer: Buffer.from('data'),
        contentType: 'image/jpeg',
      });

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getCompanyLogo(
        'authenticated-session-user-id',
        mockResponse,
      );

      expect(getRecruiterCompanyLogoUseCase.execute).toHaveBeenCalledWith(
        'authenticated-session-user-id',
      );
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
        getClass: () => RecruiterProfileController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      rolesGuard = new RolesGuard(reflector);
    });

    it('No authentication: POST /recruiter/profile/avatar -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.uploadAvatar, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: GET /recruiter/profile/avatar -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getAvatar, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: PATCH /recruiter/profile/personal -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(
        controller.updatePersonalProfile,
        undefined,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: GET /recruiter/company -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getCompany, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: PATCH /recruiter/company -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.updateCompany, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('WORKER: POST /recruiter/profile/avatar -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.uploadAvatar, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: GET /recruiter/profile/avatar -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getAvatar, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: PATCH /recruiter/profile/personal -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updatePersonalProfile, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: GET /recruiter/company -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getCompany, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: PATCH /recruiter/company -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updateCompany, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('ADMIN: GET /recruiter/company -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getCompany, {
        id: 'admin-uuid-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('ADMIN: PATCH /recruiter/company -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updateCompany, {
        id: 'admin-uuid-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER: POST /recruiter/profile/avatar -> allowed (returns true)', () => {
      const context = createMockContext(controller.uploadAvatar, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('RECRUITER: GET /recruiter/profile/avatar -> allowed (returns true)', () => {
      const context = createMockContext(controller.getAvatar, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('RECRUITER: PATCH /recruiter/profile/personal -> allowed (returns true)', () => {
      const context = createMockContext(controller.updatePersonalProfile, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('RECRUITER: GET /recruiter/company -> allowed (returns true)', () => {
      const context = createMockContext(controller.getCompany, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('RECRUITER: PATCH /recruiter/company -> allowed (returns true)', () => {
      const context = createMockContext(controller.updateCompany, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('No authentication: POST /recruiter/company/logo -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(
        controller.uploadCompanyLogo,
        undefined,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('No authentication: GET /recruiter/company/logo -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getCompanyLogo, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('WORKER: POST /recruiter/company/logo -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.uploadCompanyLogo, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('WORKER: GET /recruiter/company/logo -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getCompanyLogo, {
        id: 'worker-uuid-1',
        email: 'worker@example.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('ADMIN: POST /recruiter/company/logo -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.uploadCompanyLogo, {
        id: 'admin-uuid-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('ADMIN: GET /recruiter/company/logo -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getCompanyLogo, {
        id: 'admin-uuid-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER: POST /recruiter/company/logo -> allowed (returns true)', () => {
      const context = createMockContext(controller.uploadCompanyLogo, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('RECRUITER: GET /recruiter/company/logo -> allowed (returns true)', () => {
      const context = createMockContext(controller.getCompanyLogo, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
