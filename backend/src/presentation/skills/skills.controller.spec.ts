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
import { SkillsController } from './skills.controller';
import { IGetSkillsCatalogUseCase } from '../../application/use-cases/worker-profile/interface/get-skills-catalog.use-case.interface';
import { IGetWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-skills.use-case.interface';
import { IUpdateWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-skills.use-case.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { SkillResponseDto } from '../../application/dto/worker-profile/skill-response.dto';
import { WorkerSkillResponseDto } from '../../application/dto/worker-profile/worker-skill-response.dto';
import { UpdateWorkerSkillsInputDto } from '../../application/dto/worker-profile/update-worker-skills-input.dto';
import { Role } from '../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('SkillsController', () => {
  let controller: SkillsController;
  let getSkillsCatalogUseCase: jest.Mocked<IGetSkillsCatalogUseCase>;
  let getWorkerSkillsUseCase: jest.Mocked<IGetWorkerSkillsUseCase>;
  let updateWorkerSkillsUseCase: jest.Mocked<IUpdateWorkerSkillsUseCase>;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockCatalog: SkillResponseDto[] = [
    new SkillResponseDto({
      id: 'skill-uuid-1',
      name: 'Food Serving',
    }),
    new SkillResponseDto({
      id: 'skill-uuid-2',
      name: 'Kitchen Help',
    }),
    new SkillResponseDto({
      id: 'skill-uuid-3',
      name: 'Table Service',
    }),
  ];

  const mockWorkerSkills: WorkerSkillResponseDto[] = [
    new WorkerSkillResponseDto({
      id: 'worker-skill-uuid-1',
      skillId: 'skill-uuid-1',
      skillName: 'Food Serving',
    }),
    new WorkerSkillResponseDto({
      id: 'worker-skill-uuid-2',
      skillId: 'skill-uuid-3',
      skillName: 'Table Service',
    }),
  ];

  beforeEach(async () => {
    getSkillsCatalogUseCase = {
      execute: jest.fn(),
    };

    getWorkerSkillsUseCase = {
      execute: jest.fn(),
    };

    updateWorkerSkillsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillsController],
      providers: [
        {
          provide: IGetSkillsCatalogUseCase,
          useValue: getSkillsCatalogUseCase,
        },
        {
          provide: IGetWorkerSkillsUseCase,
          useValue: getWorkerSkillsUseCase,
        },
        {
          provide: IUpdateWorkerSkillsUseCase,
          useValue: updateWorkerSkillsUseCase,
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

    controller = module.get<SkillsController>(SkillsController);
    reflector = module.get<Reflector>(Reflector);
    rolesGuard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Metadata & Security Constraints', () => {
    it('GET /skills: should be public with no @Roles decorator', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getCatalog);
      expect(roles).toBeUndefined();
    });

    it('GET /skills: should have no guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', controller.getCatalog);
      expect(guards).toBeUndefined();
    });

    it('GET /worker/skills: should have @Roles(Role.WORKER) configured on handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.getWorkerSkills,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('GET /worker/skills: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.getWorkerSkills,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('PUT /worker/skills: should have @Roles(Role.WORKER) configured on handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.updateWorkerSkills,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.WORKER]);
    });

    it('PUT /worker/skills: should apply JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.updateWorkerSkills,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /skills (Catalog)', () => {
    it('should return the curated marketplace skills catalog', async () => {
      getSkillsCatalogUseCase.execute.mockResolvedValue(mockCatalog);

      const result = await controller.getCatalog();

      expect(getSkillsCatalogUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockCatalog);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'skill-uuid-1',
        name: 'Food Serving',
      });
      // Ensure internal database field skillType is not exposed
      expect(
        (result[0] as unknown as Record<string, unknown>).skillType,
      ).toBeUndefined();
    });

    it('should return empty array if catalog has no skills', async () => {
      getSkillsCatalogUseCase.execute.mockResolvedValue([]);

      const result = await controller.getCatalog();

      expect(getSkillsCatalogUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should propagate errors from getSkillsCatalogUseCase', async () => {
      getSkillsCatalogUseCase.execute.mockRejectedValue(
        new Error('Database query failure'),
      );

      await expect(controller.getCatalog()).rejects.toThrow(
        'Database query failure',
      );
    });
  });

  describe('GET /worker/skills', () => {
    it('should pass authenticated user ID to use case and return worker skills', async () => {
      getWorkerSkillsUseCase.execute.mockResolvedValue(mockWorkerSkills);

      const result = await controller.getWorkerSkills('worker-user-uuid-1');

      expect(getWorkerSkillsUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
      );
      expect(result).toBe(mockWorkerSkills);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'worker-skill-uuid-1',
        skillId: 'skill-uuid-1',
        skillName: 'Food Serving',
      });
      // Ensure internal field skillType is not exposed
      expect(
        (result[0] as unknown as Record<string, unknown>).skillType,
      ).toBeUndefined();
    });

    it('should return empty array [] when worker has no skills assigned', async () => {
      getWorkerSkillsUseCase.execute.mockResolvedValue([]);

      const result = await controller.getWorkerSkills('worker-user-uuid-1');

      expect(getWorkerSkillsUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
      );
      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException when worker profile is not found', async () => {
      getWorkerSkillsUseCase.execute.mockRejectedValue(
        new NotFoundException('Worker profile not found'),
      );

      await expect(
        controller.getWorkerSkills('non-existent-user'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getWorkerSkills('non-existent-user'),
      ).rejects.toThrow('Worker profile not found');
    });
  });

  describe('PUT /worker/skills', () => {
    it('should pass authenticated user ID and DTO to use case and return updated skills', async () => {
      updateWorkerSkillsUseCase.execute.mockResolvedValue(mockWorkerSkills);

      const inputDto: UpdateWorkerSkillsInputDto = {
        skillIds: ['skill-uuid-1', 'skill-uuid-3'],
      };

      const result = await controller.updateWorkerSkills(
        'worker-user-uuid-1',
        inputDto,
      );

      expect(updateWorkerSkillsUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
        inputDto,
      );
      expect(result).toBe(mockWorkerSkills);
      expect(result).toHaveLength(2);
    });

    it('should pass empty array DTO to use case for clearing skills', async () => {
      updateWorkerSkillsUseCase.execute.mockResolvedValue([]);

      const inputDto: UpdateWorkerSkillsInputDto = {
        skillIds: [],
      };

      const result = await controller.updateWorkerSkills(
        'worker-user-uuid-1',
        inputDto,
      );

      expect(updateWorkerSkillsUseCase.execute).toHaveBeenCalledWith(
        'worker-user-uuid-1',
        inputDto,
      );
      expect(result).toEqual([]);
    });

    it('should propagate BadRequestException on duplicate skill IDs', async () => {
      updateWorkerSkillsUseCase.execute.mockRejectedValue(
        new BadRequestException('Duplicate skill IDs are not allowed'),
      );

      const inputDto: UpdateWorkerSkillsInputDto = {
        skillIds: ['skill-uuid-1', 'skill-uuid-1'],
      };

      await expect(
        controller.updateWorkerSkills('worker-user-uuid-1', inputDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateWorkerSkills('worker-user-uuid-1', inputDto),
      ).rejects.toThrow('Duplicate skill IDs are not allowed');
    });

    it('should propagate BadRequestException on non-existent skill IDs', async () => {
      updateWorkerSkillsUseCase.execute.mockRejectedValue(
        new BadRequestException(
          'One or more selected skills do not exist: invalid-uuid',
        ),
      );

      const inputDto: UpdateWorkerSkillsInputDto = {
        skillIds: ['skill-uuid-1', 'invalid-uuid'],
      };

      await expect(
        controller.updateWorkerSkills('worker-user-uuid-1', inputDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateWorkerSkills('worker-user-uuid-1', inputDto),
      ).rejects.toThrow(
        'One or more selected skills do not exist: invalid-uuid',
      );
    });

    it('should propagate NotFoundException when worker profile is not found', async () => {
      updateWorkerSkillsUseCase.execute.mockRejectedValue(
        new NotFoundException('Worker profile not found'),
      );

      const inputDto: UpdateWorkerSkillsInputDto = {
        skillIds: ['skill-uuid-1'],
      };

      await expect(
        controller.updateWorkerSkills('non-existent-user', inputDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateWorkerSkills('non-existent-user', inputDto),
      ).rejects.toThrow('Worker profile not found');
    });
  });

  describe('RBAC & Authorization Guard Evaluation', () => {
    const createMockContext = (
      handler: (...args: unknown[]) => unknown,
      user?: { id: string; email: string; role?: Role },
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => SkillsController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    describe('GET /skills (Public catalog authorization)', () => {
      it('Unauthenticated: allows access (returns true)', () => {
        const context = createMockContext(controller.getCatalog, undefined);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('WORKER: allows access (returns true)', () => {
        const context = createMockContext(controller.getCatalog, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('ADMIN: allows access (returns true)', () => {
        const context = createMockContext(controller.getCatalog, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it('RECRUITER: allows access (returns true)', () => {
        const context = createMockContext(controller.getCatalog, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('GET /worker/skills (WORKER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(
          controller.getWorkerSkills,
          undefined,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getWorkerSkills, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.getWorkerSkills, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('WORKER: allows access (returns true)', () => {
        const context = createMockContext(controller.getWorkerSkills, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });

    describe('PUT /worker/skills (WORKER-only authorization)', () => {
      it('Unauthenticated: throws UnauthorizedException (401)', () => {
        const context = createMockContext(
          controller.updateWorkerSkills,
          undefined,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          UnauthorizedException,
        );
      });

      it('ADMIN: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.updateWorkerSkills, {
          id: 'admin-uuid-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('RECRUITER: throws ForbiddenException (403)', () => {
        const context = createMockContext(controller.updateWorkerSkills, {
          id: 'recruiter-uuid-1',
          email: 'recruiter@example.com',
          role: Role.RECRUITER,
        });
        expect(() => rolesGuard.canActivate(context)).toThrow(
          ForbiddenException,
        );
      });

      it('WORKER: allows access (returns true)', () => {
        const context = createMockContext(controller.updateWorkerSkills, {
          id: 'worker-uuid-1',
          email: 'worker@example.com',
          role: Role.WORKER,
        });
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });
});
