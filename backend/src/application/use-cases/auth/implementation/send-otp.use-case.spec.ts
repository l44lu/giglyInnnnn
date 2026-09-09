import {
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { IEmailService } from '../../../../domain/services/email.service.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { OtpEntity } from '../../../../domain/entities/otp.entity';
import { SendOtpUseCase, OTP_SEND_COOLDOWN_SECONDS } from './send-otp.use-case';
import { SendOtpInputDto } from '../../../dto/auth/send-otp-input.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('SendOtpUseCase', () => {
  let useCase: SendOtpUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let otpRepository: jest.Mocked<IOtpRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let otpHashingService: jest.Mocked<IOtpHashingService>;

  const defaultInput: SendOtpInputDto = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'WORKER',
  };

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

    otpRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      deleteByEmail: jest.fn(),
      updateAttempts: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    emailService = {
      sendOtpEmail: jest.fn(),
      sendPasswordResetOtpEmail: jest.fn(),
    };

    otpHashingService = {
      hashOtp: jest.fn(),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$mockedpasswordhash');

    useCase = new SendOtpUseCase(
      userRepository,
      otpRepository,
      emailService,
      otpHashingService,
    );
  });

  it('should be defined with OTP_SEND_COOLDOWN_SECONDS = 60', () => {
    expect(useCase).toBeDefined();
    expect(OTP_SEND_COOLDOWN_SECONDS).toBe(60);
  });

  // Test 1 — OTP is hashed before storage (First request / No existing OTP)
  it('Test 1 — OTP is hashed before storage: repository receives hash, not plaintext; email service receives plaintext', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    otpRepository.findByEmail.mockResolvedValue(null); // No existing OTP
    otpRepository.create.mockResolvedValue({} as any);
    emailService.sendOtpEmail.mockResolvedValue();

    const mockHash =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    otpHashingService.hashOtp.mockReturnValue(mockHash);

    const result = await useCase.execute(defaultInput);

    expect(result).toEqual({ message: 'OTP sent successfully to your email' });

    // otpHashingService.hashOtp was called with a 6-digit string
    expect(otpHashingService.hashOtp).toHaveBeenCalledTimes(1);
    const generatedPlaintextOtp = otpHashingService.hashOtp.mock.calls[0][0];
    expect(generatedPlaintextOtp).toMatch(/^\d{6}$/);

    // Repository must receive the hashed value, NOT the plaintext OTP
    expect(otpRepository.create).toHaveBeenCalledTimes(1);
    expect(otpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        otp: mockHash,
        attempts: 0,
      }),
    );
    expect(otpRepository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        otp: generatedPlaintextOtp,
      }),
    );

    // Email service receives the plaintext OTP so the user can verify
    expect(emailService.sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
      'test@example.com',
      generatedPlaintextOtp,
    );
  });

  // Test 2 — Immediate second request within cooldown (< 60s) is rejected
  it('Test 2 — Immediate second request within cooldown (< 60s): rejected with 429, no new OTP generated, existing OTP preserved', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    // Existing OTP created 25 seconds ago
    const existingOtp = new OtpEntity({
      id: 'existing-otp-id',
      email: 'test@example.com',
      otp: 'existing-hashed-otp',
      attempts: 2,
      createdAt: new Date(Date.now() - 25 * 1000), // 25s ago
      expiresAt: new Date(Date.now() + 500 * 1000),
    });
    otpRepository.findByEmail.mockResolvedValue(existingOtp);

    let caughtError: any;
    try {
      await useCase.execute(defaultInput);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(HttpException);
    expect(caughtError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(caughtError.message).toBe(
      'Please wait before requesting another OTP.',
    );

    // Confirm no new OTP generated, no DB creation, no DB deletion, no email sent
    expect(otpHashingService.hashOtp).not.toHaveBeenCalled();
    expect(otpRepository.create).not.toHaveBeenCalled();
    expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();

    // Confirm error response does not expose sensitive internals
    expect(caughtError.message).not.toContain('existing-hashed-otp');
    expect(caughtError.message).not.toContain('secret');
  });

  // Test 3 — Request after cooldown (>= 60s) succeeds, replaces previous OTP, resets attempts
  it('Test 3 — Request after cooldown (>= 60s): succeeds, deletes old OTP, creates new with attempts = 0', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    // Existing OTP created 65 seconds ago
    const existingOtp = new OtpEntity({
      id: 'old-otp-id',
      email: 'test@example.com',
      otp: 'old-hashed-otp',
      attempts: 3,
      createdAt: new Date(Date.now() - 65 * 1000), // 65s ago
      expiresAt: new Date(Date.now() + 500 * 1000),
    });
    otpRepository.findByEmail.mockResolvedValue(existingOtp);
    otpRepository.deleteByEmail.mockResolvedValue();
    otpRepository.create.mockResolvedValue({} as any);
    emailService.sendOtpEmail.mockResolvedValue();
    otpHashingService.hashOtp.mockReturnValue('new-hashed-otp-value');

    const result = await useCase.execute(defaultInput);

    expect(result).toEqual({ message: 'OTP sent successfully to your email' });

    // Old OTP was deleted
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );

    // New OTP was created with attempts = 0
    expect(otpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        otp: 'new-hashed-otp-value',
        attempts: 0,
      }),
    );
    expect(emailService.sendOtpEmail).toHaveBeenCalledTimes(1);
  });

  it('should reject if user already exists in main User database', async () => {
    userRepository.findByEmail.mockResolvedValue(
      new UserEntities({ id: 'existing-user-id' }),
    );

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      new ConflictException('User with this email already exists'),
    );

    expect(otpRepository.create).not.toHaveBeenCalled();
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('should clean up OTP record and throw InternalServerErrorException if email sending fails', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    otpRepository.findByEmail.mockResolvedValue(null);
    otpRepository.deleteByEmail.mockResolvedValue();
    otpRepository.create.mockResolvedValue({} as any);
    otpHashingService.hashOtp.mockReturnValue('hash123');
    emailService.sendOtpEmail.mockRejectedValue(new Error('SMTP down'));

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      new InternalServerErrorException(
        'Failed to send verification email. Please try again.',
      ),
    );

    // deleteByEmail was called on cleanup
    expect(otpRepository.deleteByEmail).toHaveBeenCalledTimes(1);
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
  });

  it('should reject registration request when role is ADMIN with BadRequestException', async () => {
    const adminInput = { ...defaultInput, role: 'ADMIN' as any };

    await expect(useCase.execute(adminInput)).rejects.toThrow(
      new BadRequestException(
        'ADMIN role cannot be self-assigned through public registration.',
      ),
    );

    expect(otpRepository.create).not.toHaveBeenCalled();
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });
});
