import { InternalServerErrorException } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IEmailService } from '../../../../domain/services/email.service.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { PasswordResetEntity } from '../../../../domain/entities/password-reset.entity';
import {
  ForgotPasswordUseCase,
  PASSWORD_RESET_GENERIC_RESPONSE,
  PASSWORD_RESET_COOLDOWN_SECONDS,
} from './forgot-password.use-case';
import { ForgotPasswordInputDto } from '../../../dto/auth/forgot-password-input.dto';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordResetRepository: jest.Mocked<IPasswordResetRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let otpHashingService: jest.Mocked<IOtpHashingService>;

  const defaultInput: ForgotPasswordInputDto = {
    email: 'test@example.com',
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

    emailService = {
      sendOtpEmail: jest.fn(),
      sendPasswordResetOtpEmail: jest.fn(),
    };

    otpHashingService = {
      hashOtp: jest.fn().mockReturnValue('mocked-hmac-otp-hash'),
    };

    useCase = new ForgotPasswordUseCase(
      userRepository,
      passwordResetRepository,
      emailService,
      otpHashingService,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Anti-Enumeration Boundary', () => {
    it('returns generic success response when user does NOT exist without creating OTP or sending email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await useCase.execute(defaultInput);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({ message: PASSWORD_RESET_GENERIC_RESPONSE });
      expect(passwordResetRepository.findByUserId).not.toHaveBeenCalled();
      expect(passwordResetRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetOtpEmail).not.toHaveBeenCalled();
    });

    it('normalizes email by trimming and lowercasing before lookup', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await useCase.execute({ email: '  Test@Example.COM  ' });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('Existing User Flow', () => {
    it('successfully initiates reset flow, hashes OTP, creates record, and dispatches email', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(null);
      passwordResetRepository.create.mockResolvedValue(
        new PasswordResetEntity({
          id: 'reset-uuid-1',
          userId: sampleUser.id,
          otpHash: 'mocked-hmac-otp-hash',
          attempts: 0,
          expiresAt: new Date(Date.now() + 600000),
          createdAt: new Date(),
        }),
      );
      emailService.sendPasswordResetOtpEmail.mockResolvedValue(undefined);

      const result = await useCase.execute(defaultInput);

      expect(result).toEqual({ message: PASSWORD_RESET_GENERIC_RESPONSE });
      expect(otpHashingService.hashOtp).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{6}$/),
      );
      expect(passwordResetRepository.create).toHaveBeenCalledWith({
        userId: sampleUser.id,
        otpHash: 'mocked-hmac-otp-hash',
        tokenHash: null,
        attempts: 0,
        expiresAt: expect.any(Date),
      });
      expect(emailService.sendPasswordResetOtpEmail).toHaveBeenCalledWith(
        sampleUser.email,
        expect.stringMatching(/^\d{6}$/),
      );
    });
  });

  describe('Cooldown Handling', () => {
    it('returns generic success response without sending email or creating new OTP if requested within 60 seconds (anti-enumeration boundary)', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      const recentReset = new PasswordResetEntity({
        id: 'recent-reset-1',
        userId: sampleUser.id,
        otpHash: 'old-hash',
        attempts: 0,
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      });
      passwordResetRepository.findByUserId.mockResolvedValue(recentReset);

      const result = await useCase.execute(defaultInput);

      expect(result).toEqual({ message: PASSWORD_RESET_GENERIC_RESPONSE });
      expect(passwordResetRepository.deleteByUserId).not.toHaveBeenCalled();
      expect(passwordResetRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetOtpEmail).not.toHaveBeenCalled();
    });

    it('deletes previous reset record and issues new one if cooldown has passed', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      const staleReset = new PasswordResetEntity({
        id: 'stale-reset-1',
        userId: sampleUser.id,
        otpHash: 'old-hash',
        attempts: 0,
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(
          Date.now() - (PASSWORD_RESET_COOLDOWN_SECONDS + 5) * 1000,
        ), // 65 seconds ago
      });
      passwordResetRepository.findByUserId.mockResolvedValue(staleReset);
      passwordResetRepository.deleteByUserId.mockResolvedValue(undefined);
      passwordResetRepository.create.mockResolvedValue(
        new PasswordResetEntity({
          id: 'new-reset-1',
          userId: sampleUser.id,
          otpHash: 'mocked-hmac-otp-hash',
          attempts: 0,
          expiresAt: new Date(),
          createdAt: new Date(),
        }),
      );
      emailService.sendPasswordResetOtpEmail.mockResolvedValue(undefined);

      const result = await useCase.execute(defaultInput);

      expect(passwordResetRepository.deleteByUserId).toHaveBeenCalledWith(
        sampleUser.id,
      );
      expect(passwordResetRepository.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetOtpEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: PASSWORD_RESET_GENERIC_RESPONSE });
    });
  });

  describe('Email Failure Cleanup', () => {
    it('deletes the reset record and throws 500 if email dispatch fails', async () => {
      userRepository.findByEmail.mockResolvedValue(sampleUser);
      passwordResetRepository.findByUserId.mockResolvedValue(null);
      passwordResetRepository.create.mockResolvedValue(
        new PasswordResetEntity({
          id: 'reset-1',
          userId: sampleUser.id,
          otpHash: 'hash',
          attempts: 0,
          expiresAt: new Date(),
          createdAt: new Date(),
        }),
      );
      emailService.sendPasswordResetOtpEmail.mockRejectedValue(
        new Error('SMTP connection error'),
      );

      await expect(useCase.execute(defaultInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(passwordResetRepository.deleteByUserId).toHaveBeenCalledWith(
        sampleUser.id,
      );
    });
  });
});
