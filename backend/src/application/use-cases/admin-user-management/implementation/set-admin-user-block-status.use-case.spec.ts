import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SetAdminUserBlockStatusUseCase } from './set-admin-user-block-status.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

describe('SetAdminUserBlockStatusUseCase', () => {
  let useCase: SetAdminUserBlockStatusUseCase;
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

    useCase = new SetAdminUserBlockStatusUseCase(
      userRepository,
      refreshTokenRepository,
    );
  });

  describe('1. Block Operations', () => {
    it('1. should block a WORKER user successfully and revoke refresh tokens', async () => {
      const worker = createBaseUser({
        role: Role.WORKER,
        isBlocked: false,
      });
      const updatedUser = createBaseUser({
        role: Role.WORKER,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isBlocked: true,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.id).toBe(targetUserId);
      expect(result.role).toBe(Role.WORKER);
      expect(result.isBlocked).toBe(true);
    });

    it('2. should block a RECRUITER user successfully and revoke refresh tokens', async () => {
      const recruiter = createBaseUser({
        role: Role.RECRUITER,
        isBlocked: false,
      });
      const updatedUser = createBaseUser({
        role: Role.RECRUITER,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(recruiter);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isBlocked: true,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(result.role).toBe(Role.RECRUITER);
      expect(result.isBlocked).toBe(true);
    });

    it('3. should block an ADMIN user when target is a different admin', async () => {
      const targetAdmin = createBaseUser({
        id: anotherAdminId,
        role: Role.ADMIN,
        isBlocked: false,
      });
      const updatedAdmin = createBaseUser({
        id: anotherAdminId,
        role: Role.ADMIN,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(targetAdmin);
      userRepository.update.mockResolvedValueOnce(updatedAdmin);

      const result = await useCase.execute(
        anotherAdminId,
        true,
        callingAdminId,
      );

      expect(userRepository.findById).toHaveBeenCalledWith(anotherAdminId);
      expect(userRepository.update).toHaveBeenCalledWith(anotherAdminId, {
        isBlocked: true,
      });
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        anotherAdminId,
      );
      expect(result.id).toBe(anotherAdminId);
      expect(result.role).toBe(Role.ADMIN);
      expect(result.isBlocked).toBe(true);
    });
  });

  describe('2. Unblock Operations', () => {
    it('4. should unblock a WORKER user successfully without revoking refresh tokens', async () => {
      const blockedWorker = createBaseUser({
        role: Role.WORKER,
        isBlocked: true,
      });
      const unblockedWorker = createBaseUser({
        role: Role.WORKER,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(blockedWorker);
      userRepository.update.mockResolvedValueOnce(unblockedWorker);

      const result = await useCase.execute(targetUserId, false, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isBlocked: false,
      });
      // Revocation must NOT occur during unblock
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(result.isBlocked).toBe(false);
      expect(result.role).toBe(Role.WORKER);
    });

    it('5. should unblock a RECRUITER user successfully without revoking refresh tokens', async () => {
      const blockedRecruiter = createBaseUser({
        role: Role.RECRUITER,
        isBlocked: true,
      });
      const unblockedRecruiter = createBaseUser({
        role: Role.RECRUITER,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(blockedRecruiter);
      userRepository.update.mockResolvedValueOnce(unblockedRecruiter);

      const result = await useCase.execute(targetUserId, false, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isBlocked: false,
      });
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(result.isBlocked).toBe(false);
      expect(result.role).toBe(Role.RECRUITER);
    });

    it('8. should allow an admin to unblock another user', async () => {
      const blockedUser = createBaseUser({
        id: anotherAdminId,
        isBlocked: true,
      });
      const unblockedUser = createBaseUser({
        id: anotherAdminId,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(blockedUser);
      userRepository.update.mockResolvedValueOnce(unblockedUser);

      const result = await useCase.execute(
        anotherAdminId,
        false,
        callingAdminId,
      );

      expect(userRepository.update).toHaveBeenCalledWith(anotherAdminId, {
        isBlocked: false,
      });
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('3. Security & Self-Protection Rules', () => {
    it('7. should throw ForbiddenException when admin attempts to block themselves', async () => {
      await expect(
        useCase.execute(callingAdminId, true, callingAdminId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        useCase.execute(callingAdminId, true, callingAdminId),
      ).rejects.toThrow('Admins cannot block their own account');

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if currentAdminId is missing or empty', async () => {
      await expect(useCase.execute(targetUserId, true, '')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(useCase.execute(targetUserId, true, '   ')).rejects.toThrow(
        'Authenticated admin ID is required',
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('should not prevent an admin from unblocking self if already in that state (no self-block forbidden)', async () => {
      // The security rule is strictly: Admin cannot block themselves.
      // An unblock request (isBlocked === false) for self should pass the self-check.
      const currentAdmin = createBaseUser({
        id: callingAdminId,
        role: Role.ADMIN,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(currentAdmin);

      const result = await useCase.execute(
        callingAdminId,
        false,
        callingAdminId,
      );

      // Hit no-op since already unblocked
      expect(result.isBlocked).toBe(false);
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('4. Target User Lookup & Error Handling', () => {
    it('6. should throw NotFoundException when target user does not exist', async () => {
      userRepository.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute('non-existent-user-id', true, callingAdminId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute('non-existent-user-id', true, callingAdminId),
      ).rejects.toThrow('User not found');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('19. should propagate unexpected repository errors from findById', async () => {
      userRepository.findById.mockRejectedValueOnce(
        new Error('PostgreSQL connection failure'),
      );

      await expect(
        useCase.execute(targetUserId, true, callingAdminId),
      ).rejects.toThrow('PostgreSQL connection failure');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('19. should propagate unexpected repository errors from update', async () => {
      const user = createBaseUser({ isBlocked: false });
      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockRejectedValueOnce(
        new Error('Database write constraint violation'),
      );

      await expect(
        useCase.execute(targetUserId, true, callingAdminId),
      ).rejects.toThrow('Database write constraint violation');

      // Refresh tokens should not be revoked if the DB update failed
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('19. should propagate unexpected repository errors from revokeAllForUser', async () => {
      const user = createBaseUser({ isBlocked: false });
      const updatedUser = createBaseUser({ isBlocked: true });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);
      refreshTokenRepository.revokeAllForUser.mockRejectedValueOnce(
        new Error('Redis/DB session revocation error'),
      );

      await expect(
        useCase.execute(targetUserId, true, callingAdminId),
      ).rejects.toThrow('Redis/DB session revocation error');
    });
  });

  describe('5. No-Op Idempotency Handling', () => {
    it('11. should return existing user as no-op when user is already blocked', async () => {
      const alreadyBlockedUser = createBaseUser({
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(alreadyBlockedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      // No repository update
      expect(userRepository.update).not.toHaveBeenCalled();
      // No duplicate refresh token revocation
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.isBlocked).toBe(true);
    });

    it('12. should return existing user as no-op when user is already unblocked', async () => {
      const alreadyUnblockedUser = createBaseUser({
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(alreadyUnblockedUser);

      const result = await useCase.execute(targetUserId, false, callingAdminId);

      expect(userRepository.findById).toHaveBeenCalledWith(targetUserId);
      // No repository update
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(AdminUserResponseDto);
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('6. Account State Isolation & Data Protection', () => {
    it('13. should pass ONLY isBlocked to repository update', async () => {
      const user = createBaseUser({ isBlocked: false });
      const updatedUser = createBaseUser({ isBlocked: true });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      await useCase.execute(targetUserId, true, callingAdminId);

      expect(userRepository.update).toHaveBeenCalledTimes(1);
      const updatePayload = userRepository.update.mock.calls[0][1];
      expect(updatePayload).toEqual({ isBlocked: true });
      expect(Object.keys(updatePayload)).toEqual(['isBlocked']);
    });

    it('14. should preserve role unchanged', async () => {
      const worker = createBaseUser({ role: Role.WORKER, isBlocked: false });
      const updatedUser = createBaseUser({
        role: Role.WORKER,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(worker);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(result.role).toBe(Role.WORKER);
    });

    it('15. should preserve isActive unchanged when unblocking a deactivated user', async () => {
      // Unblocking a deactivated/soft-deleted account MUST NOT reactivate it
      const deactivatedBlockedUser = createBaseUser({
        isActive: false,
        isBlocked: true,
      });
      const updatedUser = createBaseUser({
        isActive: false,
        isBlocked: false,
      });

      userRepository.findById.mockResolvedValueOnce(deactivatedBlockedUser);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, false, callingAdminId);

      expect(userRepository.update).toHaveBeenCalledWith(targetUserId, {
        isBlocked: false,
      });
      expect(result.isActive).toBe(false);
      expect(result.isBlocked).toBe(false);
    });

    it('15. should preserve isActive unchanged when blocking an active user', async () => {
      const activeUser = createBaseUser({
        isActive: true,
        isBlocked: false,
      });
      const updatedUser = createBaseUser({
        isActive: true,
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(activeUser);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(result.isActive).toBe(true);
      expect(result.isBlocked).toBe(true);
    });

    it('16. should preserve all profile fields unchanged', async () => {
      const user = createBaseUser({
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+19998887777',
        location: 'San Francisco, CA',
        bio: 'Senior Designer',
        avatarUrl: 'https://example.com/jane.jpg',
        isBlocked: false,
      });
      const updatedUser = createBaseUser({
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+19998887777',
        location: 'San Francisco, CA',
        bio: 'Senior Designer',
        avatarUrl: 'https://example.com/jane.jpg',
        isBlocked: true,
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.phone).toBe('+19998887777');
      expect(result.location).toBe('San Francisco, CA');
      expect(result.bio).toBe('Senior Designer');
    });

    it('17. should map result to AdminUserResponseDto instance', async () => {
      const user = createBaseUser({ isBlocked: false });
      const updatedUser = createBaseUser({ isBlocked: true });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      expect(result).toBeInstanceOf(AdminUserResponseDto);
    });

    it('18. should never expose sensitive fields in response', async () => {
      const user = createBaseUser({ isBlocked: false });
      const updatedUser = createBaseUser({
        isBlocked: true,
        passWordHash: '$2b$10$supersecretpasswordsaltandhash',
      });

      userRepository.findById.mockResolvedValueOnce(user);
      userRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await useCase.execute(targetUserId, true, callingAdminId);

      // Cast to any to verify fields are truly omitted
      const rawResult = result as unknown as Record<string, unknown>;
      expect(rawResult.passWordHash).toBeUndefined();
      expect(rawResult.passwordHash).toBeUndefined();
      expect(rawResult.password).toBeUndefined();
      expect(rawResult.refreshTokens).toBeUndefined();
      expect(rawResult.passwordResets).toBeUndefined();
      expect(rawResult.otp).toBeUndefined();
      expect(rawResult.verificationToken).toBeUndefined();
    });
  });
});
