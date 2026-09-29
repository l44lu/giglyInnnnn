import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUserManagementController } from './admin-user-management.controller';
import { IListAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/list-admin-users.use-case.interface';
import { IGetAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/get-admin-user.use-case.interface';
import { IUpdateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/update-admin-user.use-case.interface';
import { IChangeAdminUserRoleUseCase } from '../../application/use-cases/admin-user-management/interface/change-admin-user-role.use-case.interface';
import { ISetAdminUserBlockStatusUseCase } from '../../application/use-cases/admin-user-management/interface/set-admin-user-block-status.use-case.interface';
import { IDeactivateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/deactivate-admin-user.use-case.interface';
import { AdminUserResponseDto } from '../../application/dto/admin-user-management/admin-user.response.dto';
import { UpdateAdminUserInputDto } from '../../application/dto/admin-user-management/update-admin-user-input.dto';
import { ChangeAdminUserRoleInputDto } from '../../application/dto/admin-user-management/change-admin-user-role-input.dto';
import { SetAdminUserBlockStatusInputDto } from '../../application/dto/admin-user-management/set-admin-user-block-status-input.dto';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { Role } from '../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('AdminUserManagementController', () => {
  let controller: AdminUserManagementController;
  let listAdminUserUseCase: jest.Mocked<IListAdminUserUseCase>;
  let getAdminUserUseCase: jest.Mocked<IGetAdminUserUseCase>;
  let updateAdminUserUseCase: jest.Mocked<IUpdateAdminUserUseCase>;
  let changeAdminUserRoleUseCase: jest.Mocked<IChangeAdminUserRoleUseCase>;
  let setAdminUserBlockStatusUseCase: jest.Mocked<ISetAdminUserBlockStatusUseCase>;
  let deactivateAdminUserUseCase: jest.Mocked<IDeactivateAdminUserUseCase>;
  let reflector: Reflector;

  const mockUsers: AdminUserResponseDto[] = [
    new AdminUserResponseDto({
      id: 'user-uuid-1',
      email: 'worker@example.com',
      role: Role.WORKER,
      firstName: 'Alice',
      lastName: 'Worker',
      phone: '+1234567890',
      location: 'San Francisco, CA',
      bio: 'Skilled worker',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    new AdminUserResponseDto({
      id: 'user-uuid-2',
      email: 'recruiter@example.com',
      role: Role.RECRUITER,
      firstName: 'Bob',
      lastName: 'Recruiter',
      phone: '+1987654321',
      location: 'New York, NY',
      bio: 'Tech recruiter',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  ];

  beforeEach(async () => {
    listAdminUserUseCase = {
      execute: jest.fn(),
    };

    getAdminUserUseCase = {
      execute: jest.fn(),
    };

    updateAdminUserUseCase = {
      execute: jest.fn(),
    };

    changeAdminUserRoleUseCase = {
      execute: jest.fn(),
    };

    setAdminUserBlockStatusUseCase = {
      execute: jest.fn(),
    };

    deactivateAdminUserUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserManagementController],
      providers: [
        {
          provide: IListAdminUserUseCase,
          useValue: listAdminUserUseCase,
        },
        {
          provide: IGetAdminUserUseCase,
          useValue: getAdminUserUseCase,
        },
        {
          provide: IUpdateAdminUserUseCase,
          useValue: updateAdminUserUseCase,
        },
        {
          provide: IChangeAdminUserRoleUseCase,
          useValue: changeAdminUserRoleUseCase,
        },
        {
          provide: ISetAdminUserBlockStatusUseCase,
          useValue: setAdminUserBlockStatusUseCase,
        },
        {
          provide: IDeactivateAdminUserUseCase,
          useValue: deactivateAdminUserUseCase,
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

    controller = module.get<AdminUserManagementController>(
      AdminUserManagementController,
    );
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have updateUser method defined', () => {
    expect(controller.updateUser).toBeDefined();
    expect(typeof controller.updateUser).toBe('function');
  });

  it('should have changeUserRole method defined', () => {
    expect(controller.changeUserRole).toBeDefined();
    expect(typeof controller.changeUserRole).toBe('function');
  });

  it('should have setUserBlockStatus method defined', () => {
    expect(controller.setUserBlockStatus).toBeDefined();
    expect(typeof controller.setUserBlockStatus).toBe('function');
  });

  it('should have deactivateUser method defined', () => {
    expect(controller.deactivateUser).toBeDefined();
    expect(typeof controller.deactivateUser).toBe('function');
  });

  describe('Route Metadata & Security Constraints', () => {
    it('should have @Roles(Role.ADMIN) configured on the controller class', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        AdminUserManagementController,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard to the controller class', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        AdminUserManagementController,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on getUsers handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getUsers);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on getUsers handler', () => {
      const guards = Reflect.getMetadata('__guards__', controller.getUsers);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on getUser handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getUser);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on getUser handler', () => {
      const guards = Reflect.getMetadata('__guards__', controller.getUser);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on updateUser handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.updateUser);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on updateUser handler', () => {
      const guards = Reflect.getMetadata('__guards__', controller.updateUser);
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on changeUserRole handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.changeUserRole);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on changeUserRole handler', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.changeUserRole,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on setUserBlockStatus handler', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.setUserBlockStatus,
      );
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on setUserBlockStatus handler', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.setUserBlockStatus,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('should have @Roles(Role.ADMIN) configured on deactivateUser handler', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.deactivateUser);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('should apply JwtAuthGuard and RolesGuard on deactivateUser handler', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.deactivateUser,
      );
      expect(guards).toBeDefined();
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });
  });

  describe('GET /admin/users', () => {
    it('should delegate to IListAdminUserUseCase.execute() and return AdminUserResponseDto[]', async () => {
      listAdminUserUseCase.execute.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(listAdminUserUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUsers);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-uuid-1');
      expect(result[0].role).toBe(Role.WORKER);
      expect(result[1].id).toBe('user-uuid-2');
      expect(result[1].role).toBe(Role.RECRUITER);
    });

    it('should return empty array when use case resolves to empty list', async () => {
      listAdminUserUseCase.execute.mockResolvedValue([]);

      const result = await controller.getUsers();

      expect(listAdminUserUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should propagate errors thrown by the use case', async () => {
      const error = new Error('Database failure');
      listAdminUserUseCase.execute.mockRejectedValue(error);

      await expect(controller.getUsers()).rejects.toThrow('Database failure');
    });
  });

  describe('GET /admin/users/:userId', () => {
    it('should delegate to IGetAdminUserUseCase.execute(userId) and return mapped AdminUserResponseDto', async () => {
      getAdminUserUseCase.execute.mockResolvedValue(mockUsers[0]);

      const result = await controller.getUser('user-uuid-1');

      expect(getAdminUserUseCase.execute).toHaveBeenCalledTimes(1);
      expect(getAdminUserUseCase.execute).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toBe(mockUsers[0]);
      expect(result.id).toBe('user-uuid-1');
      expect(result.email).toBe('worker@example.com');
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      getAdminUserUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.getUser('nonexistent-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(getAdminUserUseCase.execute).toHaveBeenCalledWith(
        'nonexistent-uuid',
      );
    });
  });

  describe('PATCH /admin/users/:userId', () => {
    const updateDto: UpdateAdminUserInputDto = {
      firstName: 'AliceUpdated',
      lastName: 'WorkerUpdated',
      email: 'alice.updated@example.com',
      phone: '+1999999999',
      location: 'Oakland, CA',
      bio: 'Senior worker',
    };

    const updatedUserResponse = new AdminUserResponseDto({
      id: 'user-uuid-1',
      email: 'alice.updated@example.com',
      role: Role.WORKER,
      firstName: 'AliceUpdated',
      lastName: 'WorkerUpdated',
      phone: '+1999999999',
      location: 'Oakland, CA',
      bio: 'Senior worker',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    it('should delegate to IUpdateAdminUserUseCase.execute(userId, dto) and return updated AdminUserResponseDto unchanged', async () => {
      updateAdminUserUseCase.execute.mockResolvedValue(updatedUserResponse);

      const result = await controller.updateUser('user-uuid-1', updateDto);

      expect(updateAdminUserUseCase.execute).toHaveBeenCalledTimes(1);
      expect(updateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'user-uuid-1',
        updateDto,
      );
      expect(result).toBe(updatedUserResponse);
      expect(result.id).toBe('user-uuid-1');
      expect(result.email).toBe('alice.updated@example.com');
      expect(result.firstName).toBe('AliceUpdated');
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      updateAdminUserUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.updateUser('nonexistent-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(updateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'nonexistent-uuid',
        updateDto,
      );
    });

    it('should propagate ConflictException when email belongs to another user', async () => {
      updateAdminUserUseCase.execute.mockRejectedValue(
        new ConflictException('Email already in use'),
      );

      await expect(
        controller.updateUser('user-uuid-1', updateDto),
      ).rejects.toThrow(ConflictException);
      expect(updateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'user-uuid-1',
        updateDto,
      );
    });

    it('should propagate generic errors thrown by the use case', async () => {
      const error = new Error('Database failure');
      updateAdminUserUseCase.execute.mockRejectedValue(error);

      await expect(
        controller.updateUser('user-uuid-1', updateDto),
      ).rejects.toThrow('Database failure');
    });
  });

  describe('PATCH /admin/users/:userId/role', () => {
    const roleDto = new ChangeAdminUserRoleInputDto({
      role: Role.RECRUITER,
    });

    const roleChangedResponse = new AdminUserResponseDto({
      id: 'target-user-uuid',
      email: 'target@example.com',
      role: Role.RECRUITER,
      firstName: 'Target',
      lastName: 'User',
      phone: '+15551234567',
      location: 'Chicago, IL',
      bio: 'New recruiter',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    it('should delegate to IChangeAdminUserRoleUseCase.execute(userId, dto, currentAdminId) and return updated response', async () => {
      changeAdminUserRoleUseCase.execute.mockResolvedValue(roleChangedResponse);

      const result = await controller.changeUserRole(
        'target-user-uuid',
        roleDto,
        'acting-admin-uuid',
      );

      expect(changeAdminUserRoleUseCase.execute).toHaveBeenCalledTimes(1);
      expect(changeAdminUserRoleUseCase.execute).toHaveBeenCalledWith(
        'target-user-uuid',
        roleDto,
        'acting-admin-uuid',
      );
      expect(result).toBe(roleChangedResponse);
      expect(result.id).toBe('target-user-uuid');
      expect(result.role).toBe(Role.RECRUITER);
    });

    it('should propagate NotFoundException when target user does not exist', async () => {
      changeAdminUserRoleUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.changeUserRole(
          'nonexistent-uuid',
          roleDto,
          'acting-admin-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(changeAdminUserRoleUseCase.execute).toHaveBeenCalledWith(
        'nonexistent-uuid',
        roleDto,
        'acting-admin-uuid',
      );
    });

    it('should propagate ForbiddenException when acting admin attempts self-role change', async () => {
      changeAdminUserRoleUseCase.execute.mockRejectedValue(
        new ForbiddenException('Admins cannot change their own role'),
      );

      await expect(
        controller.changeUserRole(
          'admin-self-uuid',
          roleDto,
          'admin-self-uuid',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(changeAdminUserRoleUseCase.execute).toHaveBeenCalledWith(
        'admin-self-uuid',
        roleDto,
        'admin-self-uuid',
      );
    });

    it('should propagate generic errors thrown by the use case', async () => {
      const error = new Error('Database failure during role change');
      changeAdminUserRoleUseCase.execute.mockRejectedValue(error);

      await expect(
        controller.changeUserRole(
          'target-user-uuid',
          roleDto,
          'acting-admin-uuid',
        ),
      ).rejects.toThrow('Database failure during role change');
    });
  });

  describe('PATCH /admin/users/:userId/block', () => {
    const blockDto = new SetAdminUserBlockStatusInputDto({
      isBlocked: true,
    });

    const unblockDto = new SetAdminUserBlockStatusInputDto({
      isBlocked: false,
    });

    const blockedUserResponse = new AdminUserResponseDto({
      id: 'target-user-uuid',
      email: 'target@example.com',
      role: Role.WORKER,
      firstName: 'Target',
      lastName: 'User',
      phone: '+15551234567',
      location: 'Chicago, IL',
      bio: 'Worker',
      isActive: true,
      isBlocked: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const unblockedUserResponse = new AdminUserResponseDto({
      ...blockedUserResponse,
      isBlocked: false,
    });

    it('1. should have setUserBlockStatus method defined on controller', () => {
      expect(controller.setUserBlockStatus).toBeDefined();
      expect(typeof controller.setUserBlockStatus).toBe('function');
    });

    it('2. should have @Roles(Role.ADMIN) metadata on setUserBlockStatus method', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        controller.setUserBlockStatus,
      );
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('3. should have @UseGuards(JwtAuthGuard, RolesGuard) metadata on setUserBlockStatus method', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.setUserBlockStatus,
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('4. should delegate to ISetAdminUserBlockStatusUseCase.execute(userId, dto.isBlocked, currentAdminId) to block user and return response', async () => {
      setAdminUserBlockStatusUseCase.execute.mockResolvedValue(
        blockedUserResponse,
      );

      const result = await controller.setUserBlockStatus(
        'target-user-uuid',
        blockDto,
        'acting-admin-uuid',
      );

      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledTimes(1);
      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledWith(
        'target-user-uuid',
        true,
        'acting-admin-uuid',
      );
      expect(result).toBe(blockedUserResponse);
      expect(result.id).toBe('target-user-uuid');
      expect(result.isBlocked).toBe(true);
    });

    it('5. should delegate to ISetAdminUserBlockStatusUseCase.execute(userId, dto.isBlocked, currentAdminId) to unblock user and return response', async () => {
      setAdminUserBlockStatusUseCase.execute.mockResolvedValue(
        unblockedUserResponse,
      );

      const result = await controller.setUserBlockStatus(
        'target-user-uuid',
        unblockDto,
        'acting-admin-uuid',
      );

      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledTimes(1);
      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledWith(
        'target-user-uuid',
        false,
        'acting-admin-uuid',
      );
      expect(result).toBe(unblockedUserResponse);
      expect(result.id).toBe('target-user-uuid');
      expect(result.isBlocked).toBe(false);
    });

    it('6. should pass target userId, dto.isBlocked, and authenticated currentAdminId with no extra fields', async () => {
      setAdminUserBlockStatusUseCase.execute.mockResolvedValue(
        blockedUserResponse,
      );

      await controller.setUserBlockStatus(
        'exact-user-123',
        blockDto,
        'admin-actor-456',
      );

      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledWith(
        'exact-user-123',
        true,
        'admin-actor-456',
      );
      // Ensure exactly 3 arguments passed
      expect(setAdminUserBlockStatusUseCase.execute.mock.calls[0].length).toBe(
        3,
      );
    });

    it('7. should propagate ForbiddenException when use case throws (e.g. self-blocking)', async () => {
      setAdminUserBlockStatusUseCase.execute.mockRejectedValue(
        new ForbiddenException('Admins cannot block their own account'),
      );

      await expect(
        controller.setUserBlockStatus(
          'admin-self-uuid',
          blockDto,
          'admin-self-uuid',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledWith(
        'admin-self-uuid',
        true,
        'admin-self-uuid',
      );
    });

    it('8. should propagate NotFoundException when use case throws (target user not found)', async () => {
      setAdminUserBlockStatusUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.setUserBlockStatus(
          'nonexistent-uuid',
          blockDto,
          'acting-admin-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledWith(
        'nonexistent-uuid',
        true,
        'acting-admin-uuid',
      );
    });

    it('9. should propagate generic errors thrown by the use case', async () => {
      const error = new Error('Database failure during block status update');
      setAdminUserBlockStatusUseCase.execute.mockRejectedValue(error);

      await expect(
        controller.setUserBlockStatus(
          'target-user-uuid',
          blockDto,
          'acting-admin-uuid',
        ),
      ).rejects.toThrow('Database failure during block status update');
    });

    it('10. should not perform any block/unblock business logic itself in the controller', async () => {
      setAdminUserBlockStatusUseCase.execute.mockResolvedValue(
        blockedUserResponse,
      );

      // Verify that controller purely forwards inputs without altering or checking state
      await controller.setUserBlockStatus(
        'target-user-uuid',
        blockDto,
        'acting-admin-uuid',
      );

      expect(setAdminUserBlockStatusUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /admin/users/:userId/deactivate', () => {
    const deactivatedUserResponse = new AdminUserResponseDto({
      id: 'target-user-uuid',
      email: 'target@example.com',
      role: Role.WORKER,
      firstName: 'Target',
      lastName: 'User',
      phone: '+15551234567',
      location: 'Chicago, IL',
      bio: 'Worker',
      isActive: false,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    it('1. should have deactivateUser method defined on controller', () => {
      expect(controller.deactivateUser).toBeDefined();
      expect(typeof controller.deactivateUser).toBe('function');
    });

    it('2. should have @Roles(Role.ADMIN) metadata on deactivateUser method', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.deactivateUser);
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('3. should have @UseGuards(JwtAuthGuard, RolesGuard) metadata on deactivateUser method', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.deactivateUser,
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('4. should pass the correct target userId to execute', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      await controller.deactivateUser('target-user-uuid', 'acting-admin-uuid');

      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'target-user-uuid',
        expect.any(String),
      );
    });

    it('5. should pass the authenticated currentAdminId to execute', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      await controller.deactivateUser('target-user-uuid', 'acting-admin-uuid');

      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledWith(
        expect.any(String),
        'acting-admin-uuid',
      );
    });

    it('6. should return the use-case result unchanged', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      const result = await controller.deactivateUser(
        'target-user-uuid',
        'acting-admin-uuid',
      );

      expect(result).toBe(deactivatedUserResponse);
      expect(result.id).toBe('target-user-uuid');
      expect(result.isActive).toBe(false);
    });

    it('7. should propagate ForbiddenException when use case throws (e.g. self-deactivation)', async () => {
      deactivateAdminUserUseCase.execute.mockRejectedValue(
        new ForbiddenException('Admins cannot deactivate their own account'),
      );

      await expect(
        controller.deactivateUser('admin-self-uuid', 'admin-self-uuid'),
      ).rejects.toThrow(ForbiddenException);
      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'admin-self-uuid',
        'admin-self-uuid',
      );
    });

    it('8. should propagate NotFoundException when use case throws (user not found)', async () => {
      deactivateAdminUserUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.deactivateUser('nonexistent-uuid', 'acting-admin-uuid'),
      ).rejects.toThrow(NotFoundException);
      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'nonexistent-uuid',
        'acting-admin-uuid',
      );
    });

    it('9. should propagate unexpected errors thrown by the use case', async () => {
      const error = new Error('Database failure during deactivation');
      deactivateAdminUserUseCase.execute.mockRejectedValue(error);

      await expect(
        controller.deactivateUser('target-user-uuid', 'acting-admin-uuid'),
      ).rejects.toThrow('Database failure during deactivation');
    });

    it('10. should not require or accept a request body', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      // Method signature only takes (userId, currentAdminId)
      expect(controller.deactivateUser.length).toBe(2);

      const result = await controller.deactivateUser(
        'target-user-uuid',
        'acting-admin-uuid',
      );
      expect(result).toBe(deactivatedUserResponse);
    });

    it('11. should not perform deactivation logic itself in the controller', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      await controller.deactivateUser('target-user-uuid', 'acting-admin-uuid');

      // Controller purely delegates to the use case
      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('12. should not pass any unrelated arguments to the use case', async () => {
      deactivateAdminUserUseCase.execute.mockResolvedValue(
        deactivatedUserResponse,
      );

      await controller.deactivateUser('exact-user-123', 'admin-actor-456');

      expect(deactivateAdminUserUseCase.execute).toHaveBeenCalledWith(
        'exact-user-123',
        'admin-actor-456',
      );
      // Ensure exactly 2 arguments were passed to execute
      expect(deactivateAdminUserUseCase.execute.mock.calls[0].length).toBe(2);
    });
  });

  describe('RBAC Guard Evaluation for GET /admin/users, GET /admin/users/:userId, PATCH /admin/users/:userId, PATCH /admin/users/:userId/role, PATCH /admin/users/:userId/block, and PATCH /admin/users/:userId/deactivate', () => {
    let rolesGuard: RolesGuard;

    const createMockContext = (
      handler: (...args: unknown[]) => unknown,
      user?: { id: string; email: string; role?: Role },
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => AdminUserManagementController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
        }),
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      rolesGuard = new RolesGuard(reflector);
    });

    it('ADMIN role: GET /admin/users -> allowed (returns true)', () => {
      const context = createMockContext(controller.getUsers, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: GET /admin/users -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getUsers, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: GET /admin/users -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getUsers, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: GET /admin/users -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getUsers, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('ADMIN role: GET /admin/users/:userId -> allowed (returns true)', () => {
      const context = createMockContext(controller.getUser, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: GET /admin/users/:userId -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getUser, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: GET /admin/users/:userId -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.getUser, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: GET /admin/users/:userId -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.getUser, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('ADMIN role: PATCH /admin/users/:userId -> allowed (returns true)', () => {
      const context = createMockContext(controller.updateUser, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: PATCH /admin/users/:userId -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updateUser, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: PATCH /admin/users/:userId -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.updateUser, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: PATCH /admin/users/:userId -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.updateUser, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('ADMIN role: PATCH /admin/users/:userId/role -> allowed (returns true)', () => {
      const context = createMockContext(controller.changeUserRole, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: PATCH /admin/users/:userId/role -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.changeUserRole, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: PATCH /admin/users/:userId/role -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.changeUserRole, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: PATCH /admin/users/:userId/role -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.changeUserRole, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('ADMIN role: PATCH /admin/users/:userId/block -> allowed (returns true)', () => {
      const context = createMockContext(controller.setUserBlockStatus, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: PATCH /admin/users/:userId/block -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.setUserBlockStatus, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: PATCH /admin/users/:userId/block -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.setUserBlockStatus, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: PATCH /admin/users/:userId/block -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(
        controller.setUserBlockStatus,
        undefined,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });

    it('ADMIN role: PATCH /admin/users/:userId/deactivate -> allowed (returns true)', () => {
      const context = createMockContext(controller.deactivateUser, {
        id: 'admin-uuid-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
      });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('WORKER role: PATCH /admin/users/:userId/deactivate -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.deactivateUser, {
        id: 'worker-uuid-1',
        email: 'worker@gigly.com',
        role: Role.WORKER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('RECRUITER role: PATCH /admin/users/:userId/deactivate -> throws ForbiddenException (403)', () => {
      const context = createMockContext(controller.deactivateUser, {
        id: 'recruiter-uuid-1',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
      });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('No authentication / missing user: PATCH /admin/users/:userId/deactivate -> throws UnauthorizedException (401)', () => {
      const context = createMockContext(controller.deactivateUser, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
