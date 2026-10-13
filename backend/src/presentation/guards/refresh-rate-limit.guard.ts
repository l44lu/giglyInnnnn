import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

export const REFRESH_RATE_LIMIT = 15;
export const REFRESH_RATE_LIMIT_WINDOW_SECONDS = 60;
export const REFRESH_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS = 60;
export const REFRESH_RATE_LIMIT_MAX_ENTRIES = 10000;

@Injectable()
export class RefreshRateLimitGuard implements CanActivate {
  private static hitMap: Map<string, number[]> = new Map();
  private static lastCleanupTime = Date.now();
  private static maxEntries = REFRESH_RATE_LIMIT_MAX_ENTRIES;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const windowMs = REFRESH_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const cleanupIntervalMs =
      REFRESH_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS * 1000;
    const key = `refresh:${clientIp}`;

    const now = Date.now();

    // 1. Periodic cleanup: sweep expired entries if cleanup interval elapsed
    if (
      now - RefreshRateLimitGuard.lastCleanupTime >= cleanupIntervalMs ||
      now < RefreshRateLimitGuard.lastCleanupTime
    ) {
      RefreshRateLimitGuard.cleanup(now);
    }

    const hasEntry = RefreshRateLimitGuard.hitMap.has(key);

    // 2. Capacity protection: if this is a new client and the map is at capacity,
    // reject with HTTP 429 rather than evicting active clients' counters.
    if (
      !hasEntry &&
      RefreshRateLimitGuard.hitMap.size >= RefreshRateLimitGuard.maxEntries
    ) {
      throw new HttpException(
        'Too many refresh requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Retrieve existing timestamps for this client
    const timestamps = RefreshRateLimitGuard.hitMap.get(key) || [];

    // 4. Filter out timestamps outside the sliding window
    const validTimestamps = timestamps.filter((time) => now - time < windowMs);

    // 5. Enforce sliding-window rate limit (15 requests per 60s)
    if (validTimestamps.length >= REFRESH_RATE_LIMIT) {
      RefreshRateLimitGuard.hitMap.set(key, validTimestamps);
      throw new HttpException(
        'Too many refresh requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 6. Record the current request timestamp
    validTimestamps.push(now);
    RefreshRateLimitGuard.hitMap.set(key, validTimestamps);

    return true;
  }

  private getClientIp(request: Request): string {
    return request.ip || request.socket?.remoteAddress || 'unknown-client';
  }

  /**
   * Sweeps the in-memory hitMap and removes client entries whose timestamps
   * have all expired outside the sliding window. For active entries, trims expired timestamps.
   **/
  static cleanup(now: number = Date.now()): void {
    const windowMs = REFRESH_RATE_LIMIT_WINDOW_SECONDS * 1000;

    for (const [key, timestamps] of RefreshRateLimitGuard.hitMap.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        RefreshRateLimitGuard.hitMap.delete(key);
      } else if (validTimestamps.length < timestamps.length) {
        RefreshRateLimitGuard.hitMap.set(key, validTimestamps);
      }
    }

    RefreshRateLimitGuard.lastCleanupTime = now;
  }

  // Testing helper to reset sliding window in test suites
  static reset(): void {
    RefreshRateLimitGuard.hitMap.clear();
    RefreshRateLimitGuard.lastCleanupTime = 0;
    RefreshRateLimitGuard.maxEntries = REFRESH_RATE_LIMIT_MAX_ENTRIES;
  }

  // Testing helper to inspect internal map size
  static getHitMapSize(): number {
    return RefreshRateLimitGuard.hitMap.size;
  }

  // Testing helper to check presence of a client key
  static hasClientKey(clientIp: string): boolean {
    return RefreshRateLimitGuard.hitMap.has(`refresh:${clientIp}`);
  }

  // Testing helper to configure max entries in tests
  static setMaxEntriesForTesting(limit: number): void {
    RefreshRateLimitGuard.maxEntries = limit;
  }
}
