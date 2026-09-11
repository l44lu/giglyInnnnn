import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  LoginRateLimitGuard,
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
} from './login-rate-limit.guard';

describe('LoginRateLimitGuard', () => {
  let guard: LoginRateLimitGuard;

  const createMockContext = (options: {
    ip?: string;
    forwardedFor?: string;
    socketRemoteAddress?: string;
  }): ExecutionContext => {
    const headers: Record<string, string> = {};
    if (options.forwardedFor) {
      headers['x-forwarded-for'] = options.forwardedFor;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/auth/login',
          path: '/auth/login',
          ip: options.ip,
          headers,
          socket: options.socketRemoteAddress
            ? { remoteAddress: options.socketRemoteAddress }
            : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    LoginRateLimitGuard.reset();
    guard = new LoginRateLimitGuard();
  });

  afterEach(() => {
    LoginRateLimitGuard.reset();
  });

  it('should be defined with expected rate limit constants', () => {
    expect(guard).toBeDefined();
    expect(LOGIN_RATE_LIMIT).toBe(5);
    expect(LOGIN_RATE_LIMIT_WINDOW_SECONDS).toBe(60);
  });

  describe('UNIT TEST 1 — Requests Under Limit', () => {
    it(`should allow the first ${LOGIN_RATE_LIMIT} requests from the same IP`, () => {
      const context = createMockContext({ ip: '192.168.1.10' });

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });
  });

  describe('UNIT TEST 2 — Sixth Request Is Rejected', () => {
    it('should reject the 6th request from the same IP with HTTP 429 and exact message', () => {
      const context = createMockContext({ ip: '192.168.1.10' });

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      let error: any;
      try {
        guard.canActivate(context);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toBe(
        'Too many login attempts. Please try again later.',
      );
    });
  });

  describe('UNIT TEST 3 — Different IPs Are Independent', () => {
    it('should track different IPs independently so IP A reaching limit does not block IP B', () => {
      const contextA = createMockContext({ ip: '10.0.0.1' });
      const contextB = createMockContext({ ip: '10.0.0.2' });

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        guard.canActivate(contextA);
      }
      expect(() => guard.canActivate(contextA)).toThrow(HttpException);

      // IP B must still be allowed
      expect(guard.canActivate(contextB)).toBe(true);
    });
  });

  describe('UNIT TEST 4 — Sliding Window Expiration', () => {
    it('should allow requests again after the 60-second sliding window expires without arbitrary sleep', () => {
      const context = createMockContext({ ip: '10.0.0.3' });

      let mockCurrentTime = 1000000;
      jest.spyOn(Date, 'now').mockImplementation(() => mockCurrentTime);

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      // Advance time beyond the 60s sliding window (61 seconds)
      mockCurrentTime += (LOGIN_RATE_LIMIT_WINDOW_SECONDS + 1) * 1000;

      // New request must be allowed
      expect(guard.canActivate(context)).toBe(true);

      (Date.now as any).mockRestore?.();
    });
  });

  describe('UNIT TEST 5 — reset()', () => {
    it('should clear in-memory hitMap when reset() is called and allow subsequent requests', () => {
      const context = createMockContext({ ip: '10.0.0.4' });

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      LoginRateLimitGuard.reset();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('UNIT TEST 6 — IP Resolution & Spoofing Resistance', () => {
    it('should NOT directly trust client-supplied X-Forwarded-For and must bind rate limit strictly to request.ip', () => {
      const fixedIp = '10.0.0.1';
      // Simulate an attacker sending requests with rotating spoofed X-Forwarded-For headers
      const spoofedHops = [
        '203.0.113.195',
        '70.41.3.18, 150.172.238.178',
        '198.51.100.22',
        '10.99.99.99',
        '172.16.0.50',
      ];

      for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
        const ctx = createMockContext({
          ip: fixedIp,
          forwardedFor: spoofedHops[i],
        });
        expect(guard.canActivate(ctx)).toBe(true);
      }

      // 6th attempt with yet another spoofed X-Forwarded-For must be rejected because request.ip has reached limit
      const sixthCtx = createMockContext({
        ip: fixedIp,
        forwardedFor: '192.0.2.1',
      });
      expect(() => guard.canActivate(sixthCtx)).toThrow(HttpException);

      // A different request.ip must be unaffected even if it sends the same X-Forwarded-For
      const otherIpCtx = createMockContext({
        ip: '10.0.0.2',
        forwardedFor: '203.0.113.195',
      });
      expect(guard.canActivate(otherIpCtx)).toBe(true);
    });

    it('should resolve client IP from request.ip', () => {
      const context = createMockContext({ ip: '198.51.100.42' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should fall back to request.socket.remoteAddress when request.ip is absent', () => {
      const context = createMockContext({
        socketRemoteAddress: '198.51.100.99',
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should fall back to unknown-client when headers, request.ip, and socket are absent', () => {
      const context = createMockContext({});
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
