import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  RefreshRateLimitGuard,
  REFRESH_RATE_LIMIT,
  REFRESH_RATE_LIMIT_WINDOW_SECONDS,
  REFRESH_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS,
  REFRESH_RATE_LIMIT_MAX_ENTRIES,
} from './refresh-rate-limit.guard';

describe('RefreshRateLimitGuard', () => {
  let guard: RefreshRateLimitGuard;

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
          url: '/auth/refresh',
          path: '/auth/refresh',
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
    RefreshRateLimitGuard.reset();
    guard = new RefreshRateLimitGuard();
  });

  afterEach(() => {
    RefreshRateLimitGuard.reset();
  });

  it('should be defined with expected rate limit and cleanup constants', () => {
    expect(guard).toBeDefined();
    expect(REFRESH_RATE_LIMIT).toBe(15);
    expect(REFRESH_RATE_LIMIT_WINDOW_SECONDS).toBe(60);
    expect(REFRESH_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS).toBe(60);
    expect(REFRESH_RATE_LIMIT_MAX_ENTRIES).toBe(10000);
  });

  describe('UNIT TEST 1 — Requests Under Limit', () => {
    it(`should allow the first ${REFRESH_RATE_LIMIT} requests from the same IP`, () => {
      const context = createMockContext({ ip: '192.168.1.10' });

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });
  });

  describe('UNIT TEST 2 — 16th Request Is Rejected', () => {
    it('should reject the request exceeding the limit from the same IP with HTTP 429 and exact message', () => {
      const context = createMockContext({ ip: '192.168.1.10' });

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
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
        'Too many refresh requests. Please try again later.',
      );
    });
  });

  describe('UNIT TEST 3 — Different IPs Are Independent', () => {
    it('should track different IPs independently so IP A reaching limit does not block IP B', () => {
      const contextA = createMockContext({ ip: '10.0.0.1' });
      const contextB = createMockContext({ ip: '10.0.0.2' });

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
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

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      // Advance time beyond the 60s sliding window (61 seconds)
      mockCurrentTime += (REFRESH_RATE_LIMIT_WINDOW_SECONDS + 1) * 1000;

      // New request must be allowed
      expect(guard.canActivate(context)).toBe(true);

      (Date.now as any).mockRestore?.();
    });
  });

  describe('UNIT TEST 5 — reset()', () => {
    it('should clear in-memory hitMap when reset() is called and allow subsequent requests', () => {
      const context = createMockContext({ ip: '10.0.0.4' });

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
        guard.canActivate(context);
      }
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      RefreshRateLimitGuard.reset();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('UNIT TEST 6 — IP Resolution & Spoofing Resistance', () => {
    it('should NOT directly trust client-supplied X-Forwarded-For and must bind rate limit strictly to request.ip', () => {
      const fixedIp = '10.0.0.1';
      const spoofedHops = [
        '203.0.113.195',
        '70.41.3.18, 150.172.238.178',
        '198.51.100.22',
        '10.99.99.99',
        '172.16.0.50',
      ];

      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
        const ctx = createMockContext({
          ip: fixedIp,
          forwardedFor: spoofedHops[i % spoofedHops.length],
        });
        expect(guard.canActivate(ctx)).toBe(true);
      }

      // Next attempt with spoofed X-Forwarded-For must be rejected because request.ip has reached limit
      const nextCtx = createMockContext({
        ip: fixedIp,
        forwardedFor: '192.0.2.1',
      });
      expect(() => guard.canActivate(nextCtx)).toThrow(HttpException);

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

  describe('UNIT TEST 7 — Stale Key Cleanup and Mixed Timestamps', () => {
    it('should opportunistically purge expired client entries when another client makes a request, even if the expired client never requests again', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const clientAContext = createMockContext({ ip: '10.0.0.100' });
      const clientBContext = createMockContext({ ip: '10.0.0.200' });

      // Client A makes 3 requests at t = 100s
      guard.canActivate(clientAContext);
      guard.canActivate(clientAContext);
      guard.canActivate(clientAContext);

      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.100')).toBe(true);
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(1);

      // Advance time by 65s (past the 60s sliding window and cleanup interval)
      currentTime += 65000;

      // Client A never makes another request.
      // Client B makes a request at t = 165s.
      guard.canActivate(clientBContext);

      // Opportunistic cleanup should have purged Client A completely
      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.100')).toBe(false);
      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.200')).toBe(true);
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(1);

      (Date.now as any).mockRestore?.();
    });

    it('should trim expired timestamps in-place for clients with mixed timestamps', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const context = createMockContext({ ip: '10.2.2.2' });

      // Send 5 requests at t = 100s
      for (let i = 0; i < 5; i++) {
        guard.canActivate(context);
      }

      // Advance 40s to t = 140s and send 5 more requests (total 10)
      currentTime += 40000;
      for (let i = 0; i < 5; i++) {
        guard.canActivate(context);
      }

      // Advance 25s to t = 165s: the first 5 requests are expired (>60s), the second 5 are active (25s)
      currentTime += 25000;

      // Direct cleanup call at t = 165s
      RefreshRateLimitGuard.cleanup(currentTime);

      // Client should still be in map
      expect(RefreshRateLimitGuard.hasClientKey('10.2.2.2')).toBe(true);

      // Client can now send 10 more requests (5 active + 10 = 15 limit) before rejection
      for (let i = 0; i < 10; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      // 16th active request is rejected
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      (Date.now as any).mockRestore?.();
    });
  });

  describe('UNIT TEST 8 — Capacity Policy & Active Counter Preservation', () => {
    const TEST_CAPACITY = 5;

    beforeEach(() => {
      RefreshRateLimitGuard.setMaxEntriesForTesting(TEST_CAPACITY);
    });

    it('should reject new clients with HTTP 429 when map is at capacity and active entries cannot be removed', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Fill map to TEST_CAPACITY with 5 active clients
      for (let i = 1; i <= TEST_CAPACITY; i++) {
        const ctx = createMockContext({ ip: `10.0.0.${i}` });
        expect(guard.canActivate(ctx)).toBe(true);
      }

      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(TEST_CAPACITY);

      // Advance time by 10s (all 5 entries are still active)
      currentTime += 10000;

      // 6th distinct new client arrives
      const newClientCtx = createMockContext({ ip: '10.0.0.99' });

      let error: any;
      try {
        guard.canActivate(newClientCtx);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toBe(
        'Too many refresh requests. Please try again later.',
      );

      // Map size must not exceed capacity
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(TEST_CAPACITY);
      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.99')).toBe(false);

      (Date.now as any).mockRestore?.();
    });

    it('should NEVER evict active client counters to admit new IPs', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Client 1 sends 14 requests (1 under limit)
      const client1Ctx = createMockContext({ ip: '10.0.0.1' });
      for (let i = 0; i < REFRESH_RATE_LIMIT - 1; i++) {
        guard.canActivate(client1Ctx);
      }

      // Fill remaining capacity with Clients 2..5
      for (let i = 2; i <= TEST_CAPACITY; i++) {
        guard.canActivate(createMockContext({ ip: `10.0.0.${i}` }));
      }
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(TEST_CAPACITY);

      // Advance time by 10s
      currentTime += 10000;

      // Multiple new IPs attempt to enter
      for (let i = 100; i < 105; i++) {
        expect(() =>
          guard.canActivate(createMockContext({ ip: `10.0.0.${i}` })),
        ).toThrow(HttpException);
      }

      // Client 1's active history must NOT have been evicted
      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.1')).toBe(true);

      // Client 1 can make its 15th request
      expect(guard.canActivate(client1Ctx)).toBe(true);

      // Client 1 making a 16th request MUST be rejected with 429
      expect(() => guard.canActivate(client1Ctx)).toThrow(HttpException);

      (Date.now as any).mockRestore?.();
    });

    it('should prevent clients from resetting their request history when map is at capacity', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const client1Ctx = createMockContext({ ip: '10.0.0.1' });

      // Client 1 exhausts its 15 requests
      for (let i = 0; i < REFRESH_RATE_LIMIT; i++) {
        guard.canActivate(client1Ctx);
      }
      expect(() => guard.canActivate(client1Ctx)).toThrow(HttpException);

      // Fill remaining capacity with Clients 2..5
      for (let i = 2; i <= TEST_CAPACITY; i++) {
        guard.canActivate(createMockContext({ ip: `10.0.0.${i}` }));
      }

      // Heavy flood of new IPs attempting to force eviction
      for (let i = 100; i < 110; i++) {
        expect(() =>
          guard.canActivate(createMockContext({ ip: `10.0.0.${i}` })),
        ).toThrow(HttpException);
      }

      // Advance time by 15s (still within the 60s window for Client 1)
      currentTime += 15000;

      // Client 1 must still be blocked by 429 and cannot reset its counter
      expect(() => guard.canActivate(client1Ctx)).toThrow(HttpException);

      (Date.now as any).mockRestore?.();
    });

    it('should allow existing clients to continue making requests up to limit while map is at capacity', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Fill capacity with Clients 1..5, each making 5 requests
      for (let i = 1; i <= TEST_CAPACITY; i++) {
        const ctx = createMockContext({ ip: `10.0.0.${i}` });
        for (let req = 0; req < 5; req++) {
          guard.canActivate(ctx);
        }
      }
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(TEST_CAPACITY);

      // Advance time by 5s
      currentTime += 5000;

      // A new client is rejected
      expect(() =>
        guard.canActivate(createMockContext({ ip: '10.0.0.99' })),
      ).toThrow(HttpException);

      // But existing Client 1 can still make requests #6 through #15
      const client1Ctx = createMockContext({ ip: '10.0.0.1' });
      for (let req = 6; req <= REFRESH_RATE_LIMIT; req++) {
        expect(guard.canActivate(client1Ctx)).toBe(true);
      }

      // Request #16 for Client 1 is rejected
      expect(() => guard.canActivate(client1Ctx)).toThrow(HttpException);

      (Date.now as any).mockRestore?.();
    });

    it('should admit new clients once expired entries are cleaned up and capacity frees up', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Fill capacity with Clients 1..5 at t = 100s
      for (let i = 1; i <= TEST_CAPACITY; i++) {
        guard.canActivate(createMockContext({ ip: `10.0.0.${i}` }));
      }
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(TEST_CAPACITY);

      // At t = 110s, new client is rejected
      currentTime += 10000;
      expect(() =>
        guard.canActivate(createMockContext({ ip: '10.0.0.99' })),
      ).toThrow(HttpException);

      // Advance time by 55s to t = 165s (>60s sliding window and cleanup interval)
      currentTime += 55000;

      // New client request arrives at t = 165s.
      // Eligible cleanup runs, purging all 5 expired entries.
      // New client is admitted and allowed!
      const newClientCtx = createMockContext({ ip: '10.0.0.99' });
      expect(guard.canActivate(newClientCtx)).toBe(true);

      // Map now contains only the new client
      expect(RefreshRateLimitGuard.getHitMapSize()).toBe(1);
      expect(RefreshRateLimitGuard.hasClientKey('10.0.0.99')).toBe(true);

      (Date.now as any).mockRestore?.();
    });

    it('should NOT run global cleanup repeatedly on every request just because the map is at capacity', () => {
      let currentTime = 100000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Fill capacity at t = 100s
      for (let i = 1; i <= TEST_CAPACITY; i++) {
        guard.canActivate(createMockContext({ ip: `10.0.0.${i}` }));
      }

      // Advance time by only 5 seconds (cleanup interval of 60s has NOT elapsed)
      currentTime += 5000;

      const cleanupSpy = jest.spyOn(RefreshRateLimitGuard, 'cleanup');

      // Send 10 requests from distinct new IPs
      for (let i = 100; i < 110; i++) {
        expect(() =>
          guard.canActivate(createMockContext({ ip: `10.0.0.${i}` })),
        ).toThrow(HttpException);
      }

      // Cleanup must NOT have been called repeatedly on every request
      expect(cleanupSpy).not.toHaveBeenCalled();

      cleanupSpy.mockRestore();
      (Date.now as any).mockRestore?.();
    });
  });
});
