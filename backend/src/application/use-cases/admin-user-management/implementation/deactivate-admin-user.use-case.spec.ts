import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeactivateAdminUserUseCase } from './deactivate-admin-user.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

describe('DeactivateAdminUserUseCase', () => {
  let useCase: DeactivateAdminUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  const callingAdminId = 'calling-admin-uuid-1';
  const targetUserId = 'target-user-uuid-2';
  const anotherAdminId = 'another-admin-uuid-3';

  const createBaseUser = (overrides?: Partial<UserEntities>): UserEntities =>
    new UserEntities({
      id: targetUserId,
      email: 'target@example.com',
      passWordHash: '$2b$10$hashedsecretpassword',
      role: Role.WORKER,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+15551234567',
      location: 'New York, NY',
      bio: 'Professional worker',
      avatarUrl: 'https://example.com/avatar.jpg',
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
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

    refreshTokenRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByTokenHash: jest.fn(),
      findByToken: jest.fn(),
      deleteByTokenHash: jest.fn(),
      rotate: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new DeactivateAdminUserUseCase(
      userRepository,
      refreshTokenRepository,
    );
  });

  describe('1. Successful Deactivation Operations', () => {
    it('1. should deactivate a WORKER user successfully and revoke refresh tokens', async () => {
      const worker = createBaseUser({
        role: Role.WORKER,
        isActive: true,
      });
      const updatedUser = createBaseUser({
        role: Role.WORKER,
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isActive: false,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.id).toBe(targetUserId);
      expect(result.role).toBe(Role.WORKER);
      expect(result.isActive).toBe(false);
    });

    it('2. should deactivate a RECRUITER user successfully and revoke refresh tokens', async () => {
      const recruiter = createBaseUser({
        role: Role.RECRUITER,
        isActive: true,
      });
      const updatedUser = createBaseUser({
        role: Role.RECRUITER,
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(recruiter);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isActive: false,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(result.role).toBe(Role.RECRUITER);
      expect(result.isActive).toBe(false);
    });

    it('3. should deactivate an ADMIN user when the target is a different admin', async () => {
      const targetAdmin = createBaseUser({
        id: anotherAdminId,
        role: Role.ADMIN,
        isActive: true,
      });
      const updatedAdmin = createBaseUser({
        id: anotherAdminId,
        role: Role.ADMIN,
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(targetAdmin);
      userRepository.update.mockResolvedValueOnce(updatedAdmin);

      const result = await useCase.execute(anotherAdminId, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(anotherAdminId);
      expect(userRepository.update).toHaveBeenCalledWith(anotherAdminId, {
        isActive: false,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        anotherAdminId,
      );
      expect(result.id).toBe(anotherAdminId);
      expect(result.role).toBe(Role.ADMIN);
      expect(result.isActive).toBe(false);
    });
  });

  describe('2. Security & Self-Protection Rules', () => {
    it('5. should throw ForbiddenException when current admin attempts to deactivate themselves', async () => {
      await expect(
        useCase.execute(callingAdminId, callingAdminId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        useCase.execute(callingAdminId, callingAdminId),
      ).rejects.toThrow('Admins cannot deactivate their own account');

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('6. should throw ForbiddenException if currentAdminId is missing or empty', async () => {
      await expect(useCase.execute(targetUserId, '')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(useCase.execute(targetUserId, '   ')).rejects.toThrow(
        'Authenticated admin ID is required',
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('3. Target User Lookup & Error Handling', () => {
    it('4. should throw NotFoundException when target user does not exist', async () => {
      userRepository.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute('non-existent-user-id', callingAdminId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute('non-existent-user-id', callingAdminId),
      ).rejects.toThrow('User not found');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('16. should propagate unexpected repository errors from findById', async () => {
      userRepository.findById.mockRejectedValueOnce(
        new Error('Database read failure'),
      );

      await expect(
        useCase.execute(targetUserId, callingAdminId),
      ).rejects.toThrow('Database read failure');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('16. should propagate unexpected repository errors from update', async () => {
      const user = createBaseUser({ isActive: true });
      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockRejectedValueOnce(
        new Error('Database write constraint error'),
      );

      await expect(
        useCase.execute(targetUserId, callingAdminId),
      ).rejects.toThrow('Database write constraint error');

      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('17. should propagate unexpected repository errors from revokeAllForUser', async () => {
      const user = createBaseUser({ isActive: true });
      const updatedUser = createBaseUser({ isActive: false });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);
      refreshTokenRepository.revokeAllForUser.mockRejectedValueOnce(
        new Error('Session revocation failure'),
      );

      await expect(
        useCase.execute(targetUserId, callingAdminId),
      ).rejects.toThrow('Session revocation failure');
    });
  });

  describe('4. No-Op Idempotency for Already-Inactive Users', () => {
    it('9 & 10. should return existing user as no-op without calling update or revokeAllForUser when already inactive', async () => {
      const alreadyInactiveUser = createBaseUser({
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(alreadyInactiveUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(userRepository.delete).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.isActive).toBe(false);
    });
  });

  describe('5. Data Protection, Attribute Preservation & Safe Response', () => {
    it('7. should pass ONLY isActive: false to repository update', async () => {
      const user = createBaseUser({ isActive: true });
      const updatedUser = createBaseUser({ isActive: false });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      await useCase.execute(targetUserId, callingAdminId);

      expect(userRepository.update).toHaveBeenCalledTimes(1);
      const updatePayload = userRepository.update.mock.calls[0][1];
      expect(updatePayload).toEqual({ isActive: false });
      expect(Object.keys(updatePayload)).toEqual(['isActive']);
    });

    it('11. should preserve role unchanged after deactivation', async () => {
      const worker = createBaseUser({ role: Role.WORKER, isActive: true });
      const updatedUser = createBaseUser({
        role: Role.WORKER,
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(result.role).toBe(Role.WORKER);
    });

    it('12. should preserve isBlocked: false unchanged after deactivation', async () => {
      const user = createBaseUser({
        isActive: true,
        isBlocked: false,
      });
      const updatedUser = createBaseUser({
        isActive: false,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(result.isBlocked).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('12. should preserve isBlocked: true unchanged after deactivation', async () => {
      const user = createBaseUser({
        isActive: true,
        isBlocked: true,
      });
      const updatedUser = createBaseUser({
        isActive: false,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(result.isBlocked).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('13. should preserve all profile fields unchanged', async () => {
      const user = createBaseUser({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+19998887777',
        location: 'San Francisco, CA',
        bio: 'Senior Designer',
        avatarUrl: 'https://example.com/jane.jpg',
        isActive: true,
      });
      const updatedUser = createBaseUser({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+19998887777',
        location: 'San Francisco, CA',
        bio: 'Senior Designer',
        avatarUrl: 'https://example.com/jane.jpg',
        isActive: false,
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane.smith@example.com');
      expect(result.phone).toBe('+19998887777');
      expect(result.location).toBe('San Francisco, CA');
      expect(result.bio).toBe('Senior Designer');
    });

    it('14. should map result to AdminUserResponseDto instance', async () => {
      const user = createBaseUser({ isActive: true });
      const updatedUser = createBaseUser({ isActive: false });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      expect(result).toBeInstanceOf(AdminUserResponseDto);
    });

    it('15. should never expose sensitive fields in response', async () => {
      const user = createBaseUser({ isActive: true });
      const updatedUser = createBaseUser({
        isActive: false,
        passWordHash: '$2b$10$supersecretpasswordsaltandhash',
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, callingAdminId);

      const rawResult = result as unknown as Record<string, unknown>;
      expect(rawResult.passWordHash).toBeUndefined();
      expect(rawResult.passwordHash).toBeUndefined();
      expect(rawResult.password).toBeUndefined();
      expect(rawResult.refreshTokens).toBeUndefined();
      expect(rawResult.passwordResets).toBeUndefined();
      expect(rawResult.otp).toBeUndefined();
      expect(rawResult.verificationToken).toBeUndefined();
    });

    it('18. should strictly perform soft deletion and NEVER call userRepository.delete', async () => {
      const user = createBaseUser({ isActive: true });
      const updatedUser = createBaseUser({ isActive: false });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      await useCase.execute(targetUserId, callingAdminId);

      expect(userRepository.delete).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
