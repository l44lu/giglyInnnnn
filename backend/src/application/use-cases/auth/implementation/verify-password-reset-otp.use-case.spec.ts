import { BadRequestException, GoneException } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { PasswordResetEntity } from '../../../../domain/entities/password-reset.entity';
import { VerifyPasswordResetOtpUseCase } from './verify-password-reset-otp.use-case';
import { VerifyResetOtpInputDto } from '../../../dto/auth/verify-reset-otp-input.dto';

describe('VerifyPasswordResetOtpUseCase', () => {
  let useCase: VerifyPasswordResetOtpUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordResetRepository: jest.Mocked<IPasswordResetRepository>;
  let otpHashingService: jest.Mocked<IOtpHashingService>;

  const defaultInput: VerifyResetOtpInputDto = {
    email: 'test@example.com',
    otp: '123456',
  };

  const sampleUser = new UserEntities({
    id: 'user-uuid-1',
    email: 'test@example.com',
    passWordHash: 'hashed-password',
    role: 'WORKER',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
  });

  const sampleResetRecord = new PasswordResetEntity({
    id: 'reset-uuid-1',
    userId: sampleUser.id,
    otpHash: 'correct-hmac-hash',
    tokenHash: null,
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

    otpHashingService = {
      hashOtp: jest.fn(),
    };

    useCase = new VerifyPasswordResetOtpUseCase(
      userRepository,
      passwordResetRepository,
      otpHashingService,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('User and Request Validation', () => {
    it('throws BadRequestException if user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException('Invalid or expired password reset request.'),
      );
    });

    it('throws BadRequestException if no reset record is found for the user', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(null);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException('Invalid or expired password reset request.'),
      );
    });

    it('deletes expired record and throws GoneException if OTP has expired', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      const expiredReset = new PasswordResetEntity({
        ...sampleResetRecord,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });
      passwordResetRepository.findByUserId.mockResolvedValue(expiredReset);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new GoneException(
          'Password reset code has expired. Please request a new one.',
        ),
      );

      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        expiredReset.id,
      );
    });
  });

  describe('OTP Comparison & Attempt Limits', () => {
    it('increments attempts and throws BadRequestException on invalid OTP when attempts < 5', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(sampleResetRecord);
      otpHashingService.hashOtp.mockReturnValue('wrong-hmac-hash');

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException('Invalid verification code. Please try again.'),
      );

      expect(passwordResetRepository.updateAttempts).toHaveBeenCalledWith(
        sampleResetRecord.id,
        1,
      );
      expect(passwordResetRepository.delete).not.toHaveBeenCalled();
      expect(passwordResetRepository.setTokenHash).not.toHaveBeenCalled();
    });

    it('purges reset record and throws BadRequestException when attempts reach MAX_RESET_OTP_ATTEMPTS (5)', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      const fourAttemptsRecord = new PasswordResetEntity({
        ...sampleResetRecord,
        attempts: 4,
      });
      passwordResetRepository.findByUserId.mockResolvedValue(
        fourAttemptsRecord,
      );
      otpHashingService.hashOtp.mockReturnValue('wrong-hmac-hash');

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException(
          'Too many invalid attempts. Please request a new password reset code.',
        ),
      );

      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        fourAttemptsRecord.id,
      );
      expect(passwordResetRepository.updateAttempts).not.toHaveBeenCalled();
    });
  });

  describe('Successful OTP Verification & Single-Use Enforcement', () => {
    it('issues 32-byte hex reset authorization token, hashes it for persistence, and returns raw token', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(sampleResetRecord);
      otpHashingService.hashOtp.mockReturnValue(sampleResetRecord.otpHash);
      passwordResetRepository.consumeOtpAndSetTokenHash.mockResolvedValue(true);

      const result = await useCase.execute(defaultInput);

      expect(result.resetToken).toBeDefined();
      expect(typeof result.resetToken).toBe('string');
      expect(result.resetToken).toHaveLength(64); // 32 bytes hex = 64 characters
      expect(result.message).toBe(
        'Verification successful. You may now reset your password.',
      );

      // Verify tokenHash was persisted atomically on the record (64 hex characters)
      expect(
        passwordResetRepository.consumeOtpAndSetTokenHash,
      ).toHaveBeenCalledWith(
        sampleResetRecord.id,
        expect.stringMatching(/^[a-f0-9]{64}$/),
        expect.any(Date),
      );
    });

    it('throws BadRequestException if resetToken was already issued (single-use replay defense)', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      const consumedReset = new PasswordResetEntity({
        ...sampleResetRecord,
        tokenHash: 'already-existing-token-hash',
      });
      passwordResetRepository.findByUserId.mockResolvedValue(consumedReset);

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException('Invalid or expired password reset request.'),
      );

      expect(
        passwordResetRepository.consumeOtpAndSetTokenHash,
      ).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if atomic consumeOtpAndSetTokenHash returns false (concurrency race defense)', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(sampleResetRecord);
      otpHashingService.hashOtp.mockReturnValue(sampleResetRecord.otpHash);
      passwordResetRepository.consumeOtpAndSetTokenHash.mockResolvedValue(
        false,
      );

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        new BadRequestException('Invalid or expired password reset request.'),
      );
    });
  });
});
