import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

export const OTP_SEND_RATE_LIMIT = 5;
export const OTP_VERIFY_RATE_LIMIT = 10;
export const OTP_RATE_LIMIT_WINDOW_SECONDS = 60;

@Injectable()
export class OtpRateLimitGuard implements CanActivate {
  private static hitMap: Map<string, number[]> = new Map();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const path = request.path || request.url || '';

    const isSendOtp =
      path.includes('send-otp') || path.includes('forgot-password');
    const limit = isSendOtp ? OTP_SEND_RATE_LIMIT : OTP_VERIFY_RATE_LIMIT;
    const windowMs = OTP_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const key = `${isSendOtp ? 'send' : 'verify'}:${clientIp}`;

    const now = Date.now();
    const timestamps = OtpRateLimitGuard.hitMap.get(key) || [];

    // Filter out timestamps outside the sliding window
    const validTimestamps = timestamps.filter((time) => now - time < windowMs);

    if (validTimestamps.length >= limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validTimestamps.push(now);
    OtpRateLimitGuard.hitMap.set(key, validTimestamps);

    return true;
  }

  private getClientIp(request: Request): string {
    return request.ip || request.socket?.remoteAddress || 'unknown-client';
  }

  // Testing helper to reset sliding window in test suites
  static reset(): void {
    OtpRateLimitGuard.hitMap.clear();
  }
}
