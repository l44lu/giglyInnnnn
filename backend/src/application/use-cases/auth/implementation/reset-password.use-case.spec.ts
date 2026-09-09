import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { PasswordResetEntity } from '../../../../domain/entities/password-reset.entity';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { ResetPasswordInputDto } from '../../../dto/auth/reset-password-input.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordResetRepository: jest.Mocked<IPasswordResetRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  const rawResetToken = 'a'.repeat(64); // 64 hex characters
  const expectedTokenHash = crypto
    .createHash('sha256')
    .update(rawResetToken)
    .digest('hex');

  const defaultInput: ResetPasswordInputDto = {
    resetToken: rawResetToken,
    newPassword: 'NewSecurePassword123!',
    confirmPassword: 'NewSecurePassword123!',
  };

  const sampleResetRecord = new PasswordResetEntity({
    id: 'reset-uuid-1',
    userId: 'user-uuid-1',
    otpHash: 'mocked-otp-hash',
    tokenHash: expectedTokenHash,
    attempts: 0,
    expiresAt: new Date(Date.now() + 600000), // 10 minutes in future
    createdAt: new Date(),
  });

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    passwordResetRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      findByTokenHash: jest.fn(),
      updateAttempts: jest.fn(),
      setTokenHash: jest.fn(),
      consumeOtpAndSetTokenHash: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    refreshTokenRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByTokenHash: jest.fn(),
      findByToken: jest.fn(),
      deleteByTokenHash: jest.fn(),
      rotate: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('mocked-bcrypt-hash-456');

    useCase = new ResetPasswordUseCase(
      userRepository,
      passwordResetRepository,
      refreshTokenRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Password Matching Validation', () => {
    it('throws BadRequestException when newPassword does not match confirmPassword', async () => {
      await expect(
        useCase.execute({
          ...defaultInput,
          confirmPassword: 'MismatchingPassword!',
        }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match.'));

      expect(passwordResetRepository.findByTokenHash).not.toHaveBeenCalled();
      expect(userRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('Reset Token Verification', () => {
    it('throws UnauthorizedException when tokenHash is not found in database', async () => {
      passwordResetRepository.findByTokenHash.mockResolvedValue(null);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired password reset token.'),
      );

      expect(passwordResetRepository.findByTokenHash).toHaveBeenCalledWith(
        expectedTokenHash,
      );
      expect(userRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('deletes expired reset record and throws UnauthorizedException when reset token has expired', async () => {
      const expiredReset = new PasswordResetEntity({
        ...sampleResetRecord,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });
      passwordResetRepository.findByTokenHash.mockResolvedValue(expiredReset);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new UnauthorizedException(
          'Password reset token has expired. Please request a new one.',
        ),
      );

      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        expiredReset.id,
      );
      expect(userRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('Successful Password Reset Flow', () => {
    it('hashes password with bcrypt, updates user, revokes all sessions, and deletes reset record', async () => {
      passwordResetRepository.findByTokenHash.mockResolvedValue(
        sampleResetRecord,
      );
      userRepository.updatePassword.mockResolvedValue(undefined);
      refreshTokenRepository.revokeAllForUser.mockResolvedValue(undefined);
      passwordResetRepository.delete.mockResolvedValue(true);

      const result = await useCase.execute(defaultInput);

      // 1. Password hashing with bcrypt (10 rounds)
      expect(bcrypt.hash).toHaveBeenCalledWith(defaultInput.newPassword, 10);

      // 2. User password update in PostgreSQL
      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        sampleResetRecord.userId,
        'mocked-bcrypt-hash-456',
      );

      // 3. Security Boundary: Revoke all active refresh sessions for this user
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        sampleResetRecord.userId,
      );

      // 4. Security Boundary: Consume single-use reset authorization token
      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        sampleResetRecord.id,
      );

      // 5. Success confirmation message
      expect(result).toEqual({
        message:
          'Password has been reset successfully. Please log in with your new password.',
      });
    });
  });
});
