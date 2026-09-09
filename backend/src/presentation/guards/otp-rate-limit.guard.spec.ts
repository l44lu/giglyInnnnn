import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  OtpRateLimitGuard,
  OTP_SEND_RATE_LIMIT,
  OTP_VERIFY_RATE_LIMIT,
  OTP_RATE_LIMIT_WINDOW_SECONDS,
} from './otp-rate-limit.guard';

describe('OtpRateLimitGuard', () => {
  let guard: OtpRateLimitGuard;

  const createMockContext = (
    url: string,
    ip?: string,
    options?: {
      headers?: Record<string, string>;
      socketRemoteAddress?: string;
    },
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          path: url,
          ip,
          headers: options?.headers ?? {},
          socket: options?.socketRemoteAddress
            ? { remoteAddress: options?.socketRemoteAddress }
            : ip
              ? { remoteAddress: ip }
              : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    OtpRateLimitGuard.reset();
    guard = new OtpRateLimitGuard();
  });

  afterEach(() => {
    OtpRateLimitGuard.reset();
  });

  it('should be defined with expected rate limit constants', () => {
    expect(guard).toBeDefined();
    expect(OTP_SEND_RATE_LIMIT).toBe(5);
    expect(OTP_VERIFY_RATE_LIMIT).toBe(10);
    expect(OTP_RATE_LIMIT_WINDOW_SECONDS).toBe(60);
  });

  describe('Send OTP Endpoint Protection', () => {
    it(`should allow up to ${OTP_SEND_RATE_LIMIT} send-otp requests from the same IP`, () => {
      const context = createMockContext(
        '/auth/register/send-otp',
        '192.168.1.10',
      );

      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it(`should reject the ${OTP_SEND_RATE_LIMIT + 1}th send-otp request with 429 Too Many Requests`, () => {
      const context = createMockContext(
        '/auth/register/send-otp',
        '192.168.1.10',
      );

      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }

      let error: any;
      try {
        guard.canActivate(context);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toBe('Too many requests. Please try again later.');
    });
  });

  describe('Verify OTP Endpoint Protection', () => {
    it(`should allow up to ${OTP_VERIFY_RATE_LIMIT} verify-otp requests from the same IP`, () => {
      const context = createMockContext(
        '/auth/register/verify-otp',
        '192.168.1.20',
      );

      for (let i = 0; i < OTP_VERIFY_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it(`should reject the ${OTP_VERIFY_RATE_LIMIT + 1}th verify-otp request with 429 Too Many Requests`, () => {
      const context = createMockContext(
        '/auth/register/verify-otp',
        '192.168.1.20',
      );

      for (let i = 0; i < OTP_VERIFY_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }

      expect(() => guard.canActivate(context)).toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });
  });

  describe('Forgot Password Flow Rate Limit Protection', () => {
    it(`should limit /auth/forgot-password to ${OTP_SEND_RATE_LIMIT} requests per window`, () => {
      const context = createMockContext('/auth/forgot-password', '10.50.1.1');

      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      expect(() => guard.canActivate(context)).toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it(`should limit /auth/verify-reset-otp to ${OTP_VERIFY_RATE_LIMIT} requests per window`, () => {
      const context = createMockContext('/auth/verify-reset-otp', '10.50.1.2');

      for (let i = 0; i < OTP_VERIFY_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      expect(() => guard.canActivate(context)).toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });
  });

  describe('Independent Client IP Tracking', () => {
    it('should track different IPs independently', () => {
      const contextA = createMockContext('/auth/register/send-otp', '10.0.0.1');
      const contextB = createMockContext('/auth/register/send-otp', '10.0.0.2');

      // Exhaust IP A
      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        guard.canActivate(contextA);
      }
      expect(() => guard.canActivate(contextA)).toThrow(HttpException);

      // IP B should still be allowed
      expect(guard.canActivate(contextB)).toBe(true);
    });
  });

  describe('Window Expiration', () => {
    it('should allow requests again after the rate limit window expires', () => {
      const context = createMockContext('/auth/register/send-otp', '10.0.0.3');

      let mockCurrentTime = 1000000;
      jest.spyOn(Date, 'now').mockImplementation(() => mockCurrentTime);

      // Exhaust limit
      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      // Advance time beyond the 60s window (61 seconds)
      mockCurrentTime += 61 * 1000;

      // Should be allowed again
      expect(guard.canActivate(context)).toBe(true);

      (Date.now as any).mockRestore?.();
    });
  });

  describe('IP Resolution & Spoofing Resistance', () => {
    it('should NOT directly trust client-supplied X-Forwarded-For on send-otp and must bind rate limit strictly to request.ip', () => {
      const fixedIp = '10.0.0.1';
      const spoofedHops = [
        '203.0.113.195',
        '70.41.3.18, 150.172.238.178',
        '198.51.100.22',
        '10.99.99.99',
        '172.16.0.50',
      ];

      for (let i = 0; i < OTP_SEND_RATE_LIMIT; i++) {
        const ctx = createMockContext('/auth/register/send-otp', fixedIp, {
          headers: { 'x-forwarded-for': spoofedHops[i] },
        });
        expect(guard.canActivate(ctx)).toBe(true);
      }

      // 6th attempt with another spoofed header must be rejected
      const sixthCtx = createMockContext('/auth/register/send-otp', fixedIp, {
        headers: { 'x-forwarded-for': '192.0.2.1' },
      });
      expect(() => guard.canActivate(sixthCtx)).toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should NOT directly trust client-supplied X-Forwarded-For on verify-otp and must bind rate limit strictly to request.ip', () => {
      const fixedIp = '10.0.0.2';
      for (let i = 0; i < OTP_VERIFY_RATE_LIMIT; i++) {
        const ctx = createMockContext('/auth/register/verify-otp', fixedIp, {
          headers: { 'x-forwarded-for': `198.51.100.${i + 1}` },
        });
        expect(guard.canActivate(ctx)).toBe(true);
      }

      // 11th attempt must be rejected
      const eleventhCtx = createMockContext(
        '/auth/register/verify-otp',
        fixedIp,
        { headers: { 'x-forwarded-for': '198.51.100.99' } },
      );
      expect(() => guard.canActivate(eleventhCtx)).toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should fall back to request.socket.remoteAddress when request.ip is absent', () => {
      const context = createMockContext('/auth/register/send-otp', undefined, {
        socketRemoteAddress: '198.51.100.99',
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should fall back to unknown-client when request.ip and socket are absent', () => {
      const context = createMockContext('/auth/register/send-otp', undefined);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
