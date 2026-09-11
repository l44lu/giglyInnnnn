import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

export const LOGIN_RATE_LIMIT = 5;
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private static hitMap: Map<string, number[]> = new Map();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const windowMs = LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const key = `login:${clientIp}`;

    const now = Date.now();
    const timestamps = LoginRateLimitGuard.hitMap.get(key) || [];

    // Filter out timestamps outside the sliding window
    const validTimestamps = timestamps.filter((time) => now - time < windowMs);

    if (validTimestamps.length >= LOGIN_RATE_LIMIT) {
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validTimestamps.push(now);
    LoginRateLimitGuard.hitMap.set(key, validTimestamps);

    return true;
  }

  private getClientIp(request: Request): string {
    return request.ip || request.socket?.remoteAddress || 'unknown-client';
  }

  // Testing helper to reset sliding window in test suites
  static reset(): void {
    LoginRateLimitGuard.hitMap.clear();
  }
}
