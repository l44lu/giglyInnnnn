import { RefreshTokenHashingService } from './refresh-token-hashing.service';
import * as crypto from 'crypto';

describe('RefreshTokenHashingService', () => {
  let service: RefreshTokenHashingService;

  beforeEach(() => {
    service = new RefreshTokenHashingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Deterministic Hashing', () => {
    it('produces identical hash for the exact same input token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.payload';
      const hash1 = service.hash(token);
      const hash2 = service.hash(token);

      expect(hash1).toBe(hash2);
    });

    it('returns a 64-character lowercase hexadecimal string (SHA-256)', () => {
      const token = 'sample-refresh-jwt-token-value';
      const hash = service.hash(token);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('matches node crypto sha256 output exactly', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.another.token';
      const expected = crypto.createHash('sha256').update(token).digest('hex');

      expect(service.hash(token)).toBe(expected);
    });

    it('produces different hashes for different tokens', () => {
      const tokenA = 'token-alpha-12345';
      const tokenB = 'token-beta-67890';

      expect(service.hash(tokenA)).not.toBe(service.hash(tokenB));
    });

    it('handles empty or unexpected strings gracefully without throwing', () => {
      expect(() => service.hash('')).not.toThrow();
      const emptyHash = service.hash('');
      expect(emptyHash).toHaveLength(64);
      expect(emptyHash).toBe(
        crypto.createHash('sha256').update('').digest('hex'),
      );
    });
  });
});
