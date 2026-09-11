import { ConfigService } from '@nestjs/config';
import { OtpHashingService } from './otp-hashing.service';

describe('OtpHashingService', () => {
  const validSecret = 'test-secret-key-that-is-long-and-secure-32chars!';

  const createMockConfigService = (secretValue?: string) => {
    return {
      get: jest.fn((key: string) => {
        if (key === 'OTP_HASH_SECRET') return secretValue;
        return null;
      }),
    } as unknown as ConfigService;
  };

  describe('Secret Validation', () => {
    it('should throw an error when OTP_HASH_SECRET is missing or empty', () => {
      const emptyConfig = createMockConfigService('');
      expect(() => new OtpHashingService(emptyConfig)).toThrow(
        'OTP_HASH_SECRET environment variable is missing, empty, or set to an insecure default value.',
      );

      const undefinedConfig = createMockConfigService(undefined);
      expect(() => new OtpHashingService(undefinedConfig)).toThrow(
        'OTP_HASH_SECRET environment variable is missing, empty, or set to an insecure default value.',
      );
    });

    it('should throw an error when OTP_HASH_SECRET is set to predictable defaults', () => {
      const secretDefaultConfig = createMockConfigService('secret');
      expect(() => new OtpHashingService(secretDefaultConfig)).toThrow(
        'OTP_HASH_SECRET environment variable is missing, empty, or set to an insecure default value.',
      );

      const devDefaultConfig = createMockConfigService('development-secret');
      expect(() => new OtpHashingService(devDefaultConfig)).toThrow(
        'OTP_HASH_SECRET environment variable is missing, empty, or set to an insecure default value.',
      );
    });

    it('should successfully instantiate with a valid secret', () => {
      const validConfig = createMockConfigService(validSecret);
      const service = new OtpHashingService(validConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Hashing Behavior', () => {
    let service: OtpHashingService;

    beforeEach(() => {
      const validConfig = createMockConfigService(validSecret);
      service = new OtpHashingService(validConfig);
    });

    // Test 8 — Hash determinism
    it('Test 8 — Hash determinism: produces identical hash for same OTP and secret', () => {
      const hash1 = service.hashOtp('123456');
      const hash2 = service.hashOtp('123456');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // 256 bits in hexadecimal = 64 characters
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    // Test 9 — Different OTPs produce different hashes
    it('Test 9 — Different OTPs produce different hashes', () => {
      const hash1 = service.hashOtp('123456');
      const hash2 = service.hashOtp('654321');

      expect(hash1).not.toBe(hash2);
    });

    // Test 10 — Different secrets produce different hashes
    it('Test 10 — Different secrets produce different hashes', () => {
      const serviceSecretA = new OtpHashingService(
        createMockConfigService('secret-key-aaaa-1111-2222-3333-4444'),
      );
      const serviceSecretB = new OtpHashingService(
        createMockConfigService('secret-key-bbbb-1111-2222-3333-4444'),
      );

      const hashA = serviceSecretA.hashOtp('123456');
      const hashB = serviceSecretB.hashOtp('123456');

      expect(hashA).not.toBe(hashB);
    });

    it('should safely hash empty or unexpected strings without crashing', () => {
      expect(() => service.hashOtp('')).not.toThrow();
      expect(service.hashOtp('')).toHaveLength(64);
    });
  });
});
