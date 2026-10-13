import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../domain/enums/role.enum';
import {
  InvalidTokenError,
  TokenExpiredError,
} from '../../domain/services/token.service.interface';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;
  let configService: jest.Mocked<ConfigService>;

  const defaultSecret = 'test-access-jwt-secret-key-32chars!';
  const defaultRefreshSecret = 'test-refresh-jwt-secret-key-32ch!';
  const defaultIssuer = 'gigly-auth';
  const defaultAudience = 'gigly-app';

  beforeEach(() => {
    jwtService = new JwtService();

    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return defaultSecret;
          case 'JWT_REFRESH_SECRET':
            return defaultRefreshSecret;
          case 'JWT_ISSUER':
            return defaultIssuer;
          case 'JWT_AUDIENCE':
            return defaultAudience;
          case 'JWT_EXPIRES_IN':
            return '1h';
          case 'JWT_REFRESH_EXPIRES_IN':
            return '7d';
          default:
            return undefined;
        }
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new JwtTokenService(jwtService, configService);
  });

  describe('issueAccessToken', () => {
    it('should issue a valid access token with required payload and claims', async () => {
      const payload = {
        sub: 'user-uuid-123',
        email: 'worker@example.com',
        role: Role.WORKER,
      };

      const token = await service.issueAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = jwtService.decode<Record<string, unknown>>(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iss).toBe(defaultIssuer);
      expect(decoded.aud).toBe(defaultAudience);
      expect(typeof decoded.exp).toBe('number');
      expect(typeof decoded.iat).toBe('number');
    });

    it('should throw InvalidTokenError if payload fields are missing or contain whitespace padding', async () => {
      await expect(
        service.issueAccessToken({
          sub: '',
          email: 'worker@example.com',
          role: Role.WORKER,
        }),
      ).rejects.toThrow(InvalidTokenError);

      await expect(
        service.issueAccessToken({
          sub: '  user-123',
          email: 'worker@example.com',
          role: Role.WORKER,
        }),
      ).rejects.toThrow(InvalidTokenError);

      await expect(
        service.issueAccessToken({
          sub: 'user-123',
          email: '',
          role: Role.WORKER,
        }),
      ).rejects.toThrow(InvalidTokenError);

      await expect(
        service.issueAccessToken({
          sub: 'user-123',
          email: 'worker@example.com  ',
          role: Role.WORKER,
        }),
      ).rejects.toThrow(InvalidTokenError);

      await expect(
        service.issueAccessToken({
          sub: 'user-123',
          email: 'worker@example.com',
          role: '' as Role,
        }),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should throw Error if JWT_SECRET is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return undefined;
        return 'value';
      });

      await expect(
        service.issueAccessToken({
          sub: 'user-123',
          email: 'worker@example.com',
          role: Role.WORKER,
        }),
      ).rejects.toThrow('JWT_SECRET is not configured');
    });
  });

  describe('issueRefreshToken', () => {
    it('should issue a refresh token with sub, unique jti, and matching expiresAt', async () => {
      const input = { sub: 'user-uuid-123' };

      const result = await service.issueRefreshToken(input);
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeInstanceOf(Date);

      const decoded = jwtService.decode<Record<string, unknown>>(result.token);
      expect(decoded.sub).toBe(input.sub);
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.jti).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(decoded.iss).toBe(defaultIssuer);
      expect(decoded.aud).toBe(defaultAudience);

      // Verify returned expiresAt exactly matches the JWT's exp claim in milliseconds
      expect(result.expiresAt.getTime()).toBe((decoded.exp as number) * 1000);
    });

    it('should generate distinct unique jti identifiers for consecutive calls', async () => {
      const result1 = await service.issueRefreshToken({ sub: 'user-1' });
      const result2 = await service.issueRefreshToken({ sub: 'user-1' });

      const decoded1 = jwtService.decode<Record<string, unknown>>(
        result1.token,
      );
      const decoded2 = jwtService.decode<Record<string, unknown>>(
        result2.token,
      );

      expect(decoded1.jti).toBeDefined();
      expect(decoded2.jti).toBeDefined();
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    it('should throw InvalidTokenError if sub is missing or contains whitespace padding in input', async () => {
      await expect(service.issueRefreshToken({ sub: '' })).rejects.toThrow(
        InvalidTokenError,
      );
      await expect(
        service.issueRefreshToken({ sub: '  user-123' }),
      ).rejects.toThrow(InvalidTokenError);
      await expect(
        service.issueRefreshToken({ sub: 'user-123  ' }),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should throw Error if JWT_REFRESH_SECRET is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return 'value';
      });

      await expect(
        service.issueRefreshToken({ sub: 'user-123' }),
      ).rejects.toThrow('JWT_REFRESH_SECRET is not configured');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token and return AccessTokenPayload without mutation', async () => {
      const payload = {
        sub: 'user-uuid-456',
        email: 'recruiter@example.com',
        role: Role.RECRUITER,
      };

      const token = await service.issueAccessToken(payload);
      const verified = await service.verifyAccessToken(token);

      expect(verified).toEqual({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should reject access token signed with wrong secret', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'u@test.com', role: Role.ADMIN },
        {
          secret: 'wrong-rogue-secret-different-from-expected!',
          expiresIn: '1h',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      await expect(service.verifyAccessToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject access token with mismatched issuer', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'u@test.com', role: Role.ADMIN },
        {
          secret: defaultSecret,
          expiresIn: '1h',
          issuer: 'rogue-issuer',
          audience: defaultAudience,
        },
      );

      await expect(service.verifyAccessToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject access token with mismatched audience', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'u@test.com', role: Role.ADMIN },
        {
          secret: defaultSecret,
          expiresIn: '1h',
          issuer: defaultIssuer,
          audience: 'rogue-audience',
        },
      );

      await expect(service.verifyAccessToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject expired access token with TokenExpiredError', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'u@test.com', role: Role.WORKER },
        {
          secret: defaultSecret,
          expiresIn: '-1s',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      await expect(service.verifyAccessToken(expiredToken)).rejects.toThrow(
        TokenExpiredError,
      );
    });

    it('should reject malformed or tampered token with InvalidTokenError', async () => {
      const validToken = await service.issueAccessToken({
        sub: 'user-1',
        email: 'u@test.com',
        role: Role.WORKER,
      });

      const tamperedToken = validToken.slice(0, -6) + 'abcdef';
      await expect(service.verifyAccessToken(tamperedToken)).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(
        service.verifyAccessToken('not.a.valid.jwt'),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should reject empty or whitespace-only token string', async () => {
      await expect(service.verifyAccessToken('')).rejects.toThrow(
        InvalidTokenError,
      );
      await expect(service.verifyAccessToken('   ')).rejects.toThrow(
        InvalidTokenError,
      );
    });

    describe('Access Token Claims Validation', () => {
      it('should reject access token with empty or whitespace sub', async () => {
        const token = await jwtService.signAsync(
          { sub: '   ', email: 'worker@example.com', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject correctly signed access token with whitespace-padded sub', async () => {
        const leadingWhitespaceToken = await jwtService.signAsync(
          { sub: '  user-123', email: 'worker@example.com', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyAccessToken(leadingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);

        const trailingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123  ', email: 'worker@example.com', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyAccessToken(trailingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);
      });

      it('should reject correctly signed access token with whitespace-padded email', async () => {
        const leadingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123', email: '  worker@example.com', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyAccessToken(leadingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);

        const trailingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123', email: 'worker@example.com  ', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyAccessToken(trailingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);
      });

      it('should reject access token with non-string sub', async () => {
        const token = await jwtService.signAsync(
          { sub: 12345, email: 'worker@example.com', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject access token with empty or whitespace email', async () => {
        const token = await jwtService.signAsync(
          { sub: 'user-123', email: '   ', role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject access token with non-string email', async () => {
        const token = await jwtService.signAsync(
          { sub: 'user-123', email: true, role: Role.WORKER },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject access token with invalid role value', async () => {
        const token = await jwtService.signAsync(
          { sub: 'user-123', email: 'worker@example.com', role: 'SUPER_ADMIN' },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject access token with non-string role', async () => {
        const token = await jwtService.signAsync(
          { sub: 'user-123', email: 'worker@example.com', role: 99 },
          {
            secret: defaultSecret,
            expiresIn: '1h',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyAccessToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token and return RefreshTokenPayload with jti', async () => {
      const result = await service.issueRefreshToken({ sub: 'user-uuid-789' });

      const verified = await service.verifyRefreshToken(result.token);
      expect(verified.sub).toBe('user-uuid-789');
      expect(typeof verified.jti).toBe('string');
    });

    it('should verify a valid refresh token and return RefreshTokenPayload without mutation', async () => {
      const explicitJti = 'custom-refresh-uuid-456';
      const token = await jwtService.signAsync(
        { sub: 'user-uuid-789', jti: explicitJti },
        {
          secret: defaultRefreshSecret,
          expiresIn: '7d',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      const verified = await service.verifyRefreshToken(token);
      expect(verified.sub).toBe('user-uuid-789');
      expect(verified.jti).toBe(explicitJti);
      expect(verified).toStrictEqual({
        sub: 'user-uuid-789',
        jti: explicitJti,
      });
    });

    it('should reject refresh token signed with wrong secret', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1' },
        {
          secret: 'wrong-refresh-secret!',
          expiresIn: '7d',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      await expect(service.verifyRefreshToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject refresh token with mismatched issuer', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1' },
        {
          secret: defaultRefreshSecret,
          expiresIn: '7d',
          issuer: 'rogue-issuer',
          audience: defaultAudience,
        },
      );

      await expect(service.verifyRefreshToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject refresh token with mismatched audience', async () => {
      const rogueToken = await jwtService.signAsync(
        { sub: 'user-1' },
        {
          secret: defaultRefreshSecret,
          expiresIn: '7d',
          issuer: defaultIssuer,
          audience: 'rogue-audience',
        },
      );

      await expect(service.verifyRefreshToken(rogueToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject expired refresh token with TokenExpiredError', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 'user-1' },
        {
          secret: defaultRefreshSecret,
          expiresIn: '-1s',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      await expect(service.verifyRefreshToken(expiredToken)).rejects.toThrow(
        TokenExpiredError,
      );
    });

    it('should reject malformed or tampered refresh token with InvalidTokenError', async () => {
      const result = await service.issueRefreshToken({ sub: 'user-1' });
      const tampered = result.token.slice(0, -6) + 'xyz123';

      await expect(service.verifyRefreshToken(tampered)).rejects.toThrow(
        InvalidTokenError,
      );
      await expect(
        service.verifyRefreshToken('corrupted-token'),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should reject empty or whitespace-only token string', async () => {
      await expect(service.verifyRefreshToken('')).rejects.toThrow(
        InvalidTokenError,
      );
      await expect(service.verifyRefreshToken('   ')).rejects.toThrow(
        InvalidTokenError,
      );
    });

    describe('Refresh Token Claims Validation', () => {
      it('should reject refresh token with empty or whitespace sub', async () => {
        const token = await jwtService.signAsync(
          { sub: '   ', jti: 'some-uuid-123' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyRefreshToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject correctly signed refresh token with whitespace-padded sub', async () => {
        const leadingWhitespaceToken = await jwtService.signAsync(
          { sub: '  user-123', jti: 'some-uuid-123' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(leadingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);

        const trailingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123  ', jti: 'some-uuid-123' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(trailingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);
      });

      it('should reject correctly signed refresh token with whitespace-padded jti', async () => {
        const leadingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123', jti: '  some-uuid-123' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(leadingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);

        const trailingWhitespaceToken = await jwtService.signAsync(
          { sub: 'user-123', jti: 'some-uuid-123  ' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(trailingWhitespaceToken),
        ).rejects.toThrow(InvalidTokenError);
      });

      it('should reject refresh token with non-string sub', async () => {
        const token = await jwtService.signAsync(
          { sub: 12345, jti: 'some-uuid-123' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(service.verifyRefreshToken(token)).rejects.toThrow(
          InvalidTokenError,
        );
      });

      it('should reject refresh token when jti is present but not a string', async () => {
        const tokenWithNumberJti = await jwtService.signAsync(
          { sub: 'user-123', jti: 12345 },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(tokenWithNumberJti),
        ).rejects.toThrow(InvalidTokenError);
      });

      it('should reject refresh token when jti is present but whitespace-only', async () => {
        const tokenWithEmptyJti = await jwtService.signAsync(
          { sub: 'user-123', jti: '   ' },
          {
            secret: defaultRefreshSecret,
            expiresIn: '7d',
            issuer: defaultIssuer,
            audience: defaultAudience,
          },
        );
        await expect(
          service.verifyRefreshToken(tokenWithEmptyJti),
        ).rejects.toThrow(InvalidTokenError);
      });
    });
  });

  describe('Secret Separation & Non-Interchangeability', () => {
    it('should reject access token when verified with verifyRefreshToken', async () => {
      const accessToken = await service.issueAccessToken({
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.WORKER,
      });

      // Verification with refresh secret must fail
      await expect(service.verifyRefreshToken(accessToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should reject refresh token when verified with verifyAccessToken', async () => {
      const refreshTokenResult = await service.issueRefreshToken({
        sub: 'user-123',
      });

      // Verification with access secret must fail
      await expect(
        service.verifyAccessToken(refreshTokenResult.token),
      ).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('Error Sanitization and Distinction', () => {
    it('should never expose secret or token payload in error messages', async () => {
      try {
        await service.verifyAccessToken('invalid.token.here');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).not.toContain(defaultSecret);
        expect(err.message).not.toContain('invalid.token.here');
      }

      try {
        await service.verifyRefreshToken('invalid.token.here');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).not.toContain(defaultRefreshSecret);
        expect(err.message).not.toContain('invalid.token.here');
      }
    });

    it('TokenExpiredError should be an instance of InvalidTokenError and Error', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'u@test.com', role: Role.WORKER },
        {
          secret: defaultSecret,
          expiresIn: '-1s',
          issuer: defaultIssuer,
          audience: defaultAudience,
        },
      );

      try {
        await service.verifyAccessToken(expiredToken);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(TokenExpiredError);
        expect(err).toBeInstanceOf(InvalidTokenError);
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
