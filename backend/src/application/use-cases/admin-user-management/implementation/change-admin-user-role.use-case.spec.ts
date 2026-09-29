import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChangeAdminUserRoleUseCase } from './change-admin-user-role.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { ChangeAdminUserRoleInputDto } from '../../../dto/admin-user-management/change-admin-user-role-input.dto';

describe('ChangeAdminUserRoleUseCase', () => {
  let useCase: ChangeAdminUserRoleUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  const callingAdminId = 'calling-admin-uuid';
  const targetUserId = 'target-user-uuid';

  const createBaseUser = (role: Role = Role.WORKER): UserEntities =>
    new UserEntities({
      id: targetUserId,
      email: 'target@example.com',
      passWordHash: '$2b$10$hashedsecret',
      role,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+15551234567',
      location: 'New York, NY',
      bio: 'Software developer',
      avatarUrl: 'https://example.com/avatar.jpg',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new ChangeAdminUserRoleUseCase(userRepository);
  });

  describe('Role Transitions', () => {
    it('1. should change role from WORKER to RECRUITER', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.RECRUITER,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.RECRUITER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.RECRUITER,
      });
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.role).toBe(Role.RECRUITER);
    });

    it('2. should change role from RECRUITER to WORKER', async () => {
      const recruiter = createBaseUser(Role.RECRUITER);
      const updatedUser = new UserEntities({
        ...recruiter,
        role: Role.WORKER,
      });

      userRepository.findById.mockResolvedValueOnce(recruiter);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.WORKER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.WORKER,
      });
      expect(result.role).toBe(Role.WORKER);
    });

    it('3. should change role from WORKER to ADMIN', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.ADMIN,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.ADMIN,
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('4. should change role from RECRUITER to ADMIN', async () => {
      const recruiter = createBaseUser(Role.RECRUITER);
      const updatedUser = new UserEntities({
        ...recruiter,
        role: Role.ADMIN,
      });

      userRepository.findById.mockResolvedValueOnce(recruiter);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.ADMIN,
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('5. should change role from ADMIN to WORKER when performed by another admin', async () => {
      const otherAdmin = createBaseUser(Role.ADMIN);
      const updatedUser = new UserEntities({
        ...otherAdmin,
        role: Role.WORKER,
      });

      userRepository.findById.mockResolvedValueOnce(otherAdmin);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.WORKER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.WORKER,
      });
      expect(result.role).toBe(Role.WORKER);
    });

    it('6. should change role from ADMIN to RECRUITER when performed by another admin', async () => {
      const otherAdmin = createBaseUser(Role.ADMIN);
      const updatedUser = new UserEntities({
        ...otherAdmin,
        role: Role.RECRUITER,
      });

      userRepository.findById.mockResolvedValueOnce(otherAdmin);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.RECRUITER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.RECRUITER,
      });
      expect(result.role).toBe(Role.RECRUITER);
    });
  });

  describe('Validation & Security Guards', () => {
    it('7. should throw NotFoundException when target user does not exist', async () => {
      userRepository.findById.mockResolvedValueOnce(null);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });

      await expect(
        useCase.execute('non-existent-uuid', dto, callingAdminId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('non-existent-uuid', dto, callingAdminId),
      ).rejects.toThrow('User not found');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('8. should throw ForbiddenException when current admin tries to change their own role', async () => {
      const dto = new ChangeAdminUserRoleInputDto({ role: Role.WORKER });

      // callingAdminId matches targetUserId
      await expect(
        useCase.execute(callingAdminId, dto, callingAdminId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute(callingAdminId, dto, callingAdminId),
      ).rejects.toThrow('Admins cannot change their own role');

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('9. should handle no-op when requested role is already the target user current role (no repository update call)', async () => {
      const worker = createBaseUser(Role.WORKER);
      userRepository.findById.mockResolvedValueOnce(worker);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.WORKER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.role).toBe(Role.WORKER);
      expect(result.id).toBe(targetUserId);
    });
  });

  describe('Isolation, Mapping & Unrelated Fields Integrity', () => {
    it('10. should pass ONLY the role property to userRepository.update and no other fields', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.ADMIN,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });
      await useCase.execute(targetUserId, dto, callingAdminId);

      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        role: Role.ADMIN,
      });
      // Ensure only 1 key ('role') is present in update argument
      const updatePayload = userRepository.update.mock.calls[0][1];
      expect(Object.keys(updatePayload)).toEqual(['role']);
    });

    it('11. should return result mapped as AdminUserResponseDto through AdminUserMapper', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.RECRUITER,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.RECRUITER });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.id).toBe(targetUserId);
      expect(result.email).toBe('target@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.phone).toBe('+15551234567');
      expect(result.location).toBe('New York, NY');
      expect(result.bio).toBe('Software developer');
      expect(result.isActive).toBe(true);
      expect(result.isBlocked).toBe(false);
      expect(result.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('12. should preserve all other user fields unchanged on the returned user entity', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.ADMIN,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });
      const result = await useCase.execute(targetUserId, dto, callingAdminId);

      expect(result.firstName).toBe(worker.firstName);
      expect(result.lastName).toBe(worker.lastName);
      expect(result.email).toBe(worker.email);
      expect(result.phone).toBe(worker.phone);
      expect(result.location).toBe(worker.location);
      expect(result.bio).toBe(worker.bio);
      expect(result.isActive).toBe(worker.isActive);
      expect(result.isBlocked).toBe(worker.isBlocked);
    });

    it('13. should ensure sensitive fields (passWordHash, password) are absent from response DTO', async () => {
      const worker = createBaseUser(Role.WORKER);
      const updatedUser = new UserEntities({
        ...worker,
        role: Role.ADMIN,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });
      const result = (await useCase.execute(
        targetUserId,
        dto,
        callingAdminId,
      )) as unknown as Record<string, unknown>;

      expect(result.passWordHash).toBeUndefined();
      expect(result.passwordHash).toBeUndefined();
      expect(result.password).toBeUndefined();
      expect(result.refreshTokens).toBeUndefined();
      expect(result.otp).toBeUndefined();
    });

    it('14. should propagate unexpected repository errors', async () => {
      userRepository.findById.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const dto = new ChangeAdminUserRoleInputDto({ role: Role.ADMIN });

      await expect(
        useCase.execute(targetUserId, dto, callingAdminId),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
