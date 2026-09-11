import { BadRequestException, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { OtpHashingService } from '../../../../infrastructure/crypto/otp-hashing.service';
import { OtpEntity } from '../../../../domain/entities/otp.entity';
import { UserEntities } from '../../../../domain/entities/user.entities';
import {
  VerifyOtpAndRegisterUseCase,
  MAX_OTP_ATTEMPTS,
} from './verify-otp-register.use-case';

describe('VerifyOtpAndRegisterUseCase', () => {
  let useCase: VerifyOtpAndRegisterUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let otpRepository: jest.Mocked<IOtpRepository>;
  let otpHashingService: OtpHashingService;

  const testSecret = 'spec-secret-key-that-is-at-least-32-chars-long!';

  const defaultMockOtp = (): OtpEntity =>
    new OtpEntity({
      id: 'otp-uuid-1',
      email: 'test@example.com',
      // Stored in PostgreSQL as HMAC-SHA256 digest
      otp: otpHashingService.hashOtp('123456'),
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '$2b$10$hashedpassword',
      role: 'WORKER',
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future
      createdAt: new Date(),
    });

  const defaultMockUser = (): UserEntities =>
    new UserEntities({
      id: 'user-uuid-1',
      email: 'test@example.com',
      passWordHash: '$2b$10$hashedpassword',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WORKER',
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

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OTP_HASH_SECRET') return testSecret;
        return null;
      }),
    } as unknown as ConfigService;

    otpHashingService = new OtpHashingService(mockConfigService);

    useCase = new VerifyOtpAndRegisterUseCase(
      userRepository,
      otpRepository,
      otpHashingService,
    );
  });

  it('should be defined with MAX_OTP_ATTEMPTS = 5', () => {
    expect(useCase).toBeDefined();
    expect(MAX_OTP_ATTEMPTS).toBe(5);
  });

  // Test 2 — Correct OTP verifies
  it('Test 2 — Correct OTP verifies: given stored HMAC and submitted OTP, succeeds, creates user, deletes OTP, does not increment attempts', async () => {
    const mockOtp = defaultMockOtp();
    const mockUser = defaultMockUser();

    // Verify stored OTP is a 64-char HMAC hash, not plaintext
    expect(mockOtp.otp).toHaveLength(64);
    expect(mockOtp.otp).not.toBe('123456');

    otpRepository.findByEmail.mockResolvedValue(mockOtp);
    userRepository.create.mockResolvedValue(mockUser);
    otpRepository.deleteByEmail.mockResolvedValue();

    const result = await useCase.execute({
      email: 'test@example.com',
      otp: '123456',
    });

    expect(result).toEqual({
      id: 'user-uuid-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WORKER',
      createdAt: mockUser.createdAt,
    });
    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(userRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      passWordHash: '$2b$10$hashedpassword',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WORKER',
    });
    expect(otpRepository.deleteByEmail).toHaveBeenCalledTimes(1);
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(otpRepository.updateAttempts).not.toHaveBeenCalled();
  });

  // Test 3 — Incorrect OTP
  it('Test 3 — Incorrect OTP: wrong OTP fails, attempts incremented to 1, OTP remains available', async () => {
    const mockOtp = defaultMockOtp();
    mockOtp.attempts = 0;

    otpRepository.findByEmail.mockResolvedValue(mockOtp);
    otpRepository.updateAttempts.mockResolvedValue({
      ...mockOtp,
      attempts: 1,
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: '654321',
      }),
    ).rejects.toThrow(
      new BadRequestException('Invalid OTP. Please try again.'),
    );

    expect(otpRepository.updateAttempts).toHaveBeenCalledTimes(1);
    expect(otpRepository.updateAttempts).toHaveBeenCalledWith(
      'test@example.com',
      1,
    );
    expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('Test 3b — Attempts 2–4: increments attempts sequentially and preserves OTP record', async () => {
    for (let currentAttempts = 1; currentAttempts <= 3; currentAttempts++) {
      const mockOtp = defaultMockOtp();
      mockOtp.attempts = currentAttempts;

      otpRepository.findByEmail.mockResolvedValue(mockOtp);
      otpRepository.updateAttempts.mockResolvedValue({
        ...mockOtp,
        attempts: currentAttempts + 1,
      });

      await expect(
        useCase.execute({
          email: 'test@example.com',
          otp: '999999',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid OTP. Please try again.'),
      );

      expect(otpRepository.updateAttempts).toHaveBeenCalledWith(
        'test@example.com',
        currentAttempts + 1,
      );
      expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    }
  });

  // Test 4 — Fifth failed attempt
  it('Test 4 — Fifth failed attempt: causes attempts = 5, deletes/invalidates OTP, throws lockout exception', async () => {
    const mockOtp = defaultMockOtp();
    mockOtp.attempts = 4; // Previous 4 failures

    otpRepository.findByEmail.mockResolvedValue(mockOtp);
    otpRepository.deleteByEmail.mockResolvedValue();

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: '000000',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Too many invalid attempts. Please request a new OTP.',
      ),
    );

    // Should immediately delete OTP
    expect(otpRepository.deleteByEmail).toHaveBeenCalledTimes(1);
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    // Should NOT call updateAttempts since record is destroyed
    expect(otpRepository.updateAttempts).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  // Test 5 — Sixth attempt
  it('Test 5 — Sixth attempt: original OTP no longer exists, correct OTP cannot be used after lockout', async () => {
    // After lockout, findByEmail returns null because OTP was deleted
    otpRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: '123456', // Even the correct OTP
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'No OTP found for this email. Please request a new one.',
      ),
    );

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(otpRepository.updateAttempts).not.toHaveBeenCalled();
  });

  // Test 6 — Expired OTP
  it('Test 6 — Expired OTP: rejected, deleted, throws GoneException', async () => {
    const mockOtp = defaultMockOtp();
    mockOtp.expiresAt = new Date(Date.now() - 1000); // 1s in the past

    otpRepository.findByEmail.mockResolvedValue(mockOtp);
    otpRepository.deleteByEmail.mockResolvedValue();

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: '123456',
      }),
    ).rejects.toThrow(
      new GoneException('OTP has expired. Please request a new one.'),
    );

    expect(otpRepository.deleteByEmail).toHaveBeenCalledTimes(1);
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(otpRepository.updateAttempts).not.toHaveBeenCalled();
  });

  // Test 7 — Missing OTP
  it('Test 7 — Missing OTP: behaves according to existing implementation when OTP is not found', async () => {
    otpRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'notfound@example.com',
        otp: '123456',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'No OTP found for this email. Please request a new one.',
      ),
    );

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
    expect(otpRepository.updateAttempts).not.toHaveBeenCalled();
  });

  // Test 8 — Unequal-length OTP input
  describe('Test 8 — Unequal-length OTP input', () => {
    const testCases = ['', '1', '12345', '1234567'];

    testCases.forEach((invalidLengthOtp) => {
      it(`safely rejects input "${invalidLengthOtp}" without RangeError`, async () => {
        const mockOtp = defaultMockOtp();
        mockOtp.attempts = 0;

        otpRepository.findByEmail.mockResolvedValue(mockOtp);
        otpRepository.updateAttempts.mockResolvedValue({
          ...mockOtp,
          attempts: 1,
        });

        // Must not throw RangeError or unhandled exception
        await expect(
          useCase.execute({
            email: 'test@example.com',
            otp: invalidLengthOtp,
          }),
        ).rejects.toThrow(
          new BadRequestException('Invalid OTP. Please try again.'),
        );

        expect(otpRepository.updateAttempts).toHaveBeenCalledWith(
          'test@example.com',
          1,
        );
        expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
        expect(userRepository.create).not.toHaveBeenCalled();
      });
    });
  });

  // Test 9 — Non-numeric input
  it('Test 9 — Non-numeric input: fails safely for "abcdef"', async () => {
    const mockOtp = defaultMockOtp();
    mockOtp.attempts = 0;

    otpRepository.findByEmail.mockResolvedValue(mockOtp);
    otpRepository.updateAttempts.mockResolvedValue({
      ...mockOtp,
      attempts: 1,
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: 'abcdef',
      }),
    ).rejects.toThrow(
      new BadRequestException('Invalid OTP. Please try again.'),
    );

    expect(otpRepository.updateAttempts).toHaveBeenCalledWith(
      'test@example.com',
      1,
    );
    expect(otpRepository.deleteByEmail).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  // Test 10 — OTP reuse
  it('Test 10 — OTP reuse: after successful registration, OTP cannot be used again', async () => {
    const mockOtp = defaultMockOtp();
    const mockUser = defaultMockUser();

    // First call: OTP exists
    otpRepository.findByEmail.mockResolvedValueOnce(mockOtp);
    userRepository.create.mockResolvedValue(mockUser);
    otpRepository.deleteByEmail.mockResolvedValue();

    const firstResult = await useCase.execute({
      email: 'test@example.com',
      otp: '123456',
    });
    expect(firstResult.id).toBe('user-uuid-1');
    expect(otpRepository.deleteByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );

    // Second call: OTP record has been deleted
    otpRepository.findByEmail.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: '123456',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'No OTP found for this email. Please request a new one.',
      ),
    );
  });

  // Test 11 — Attempt persistence
  it('Test 11 — Attempt persistence: verifies incremented count is passed through repository update mechanism', async () => {
    const mockOtp = defaultMockOtp();
    mockOtp.attempts = 2;

    otpRepository.findByEmail.mockResolvedValue(mockOtp);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        otp: 'wrong1',
      }),
    ).rejects.toThrow(
      new BadRequestException('Invalid OTP. Please try again.'),
    );

    // Verifying that repository.updateAttempts was specifically invoked with the incremented value (3)
    expect(otpRepository.updateAttempts).toHaveBeenCalledTimes(1);
    expect(otpRepository.updateAttempts).toHaveBeenCalledWith(
      'test@example.com',
      3,
    );
  });
});
