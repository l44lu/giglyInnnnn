import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export const ACCESS_COOKIE_PATH = '/';
export const REFRESH_COOKIE_PATH = '/auth';

export const ACCESS_COOKIE_MAX_AGE_MS = 1 * 60 * 60 * 1000; // 1 hour
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  getAccessCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      path: ACCESS_COOKIE_PATH,
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    };
  }

  getClearAccessCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      path: ACCESS_COOKIE_PATH,
    };
  }

  getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    };
  }

  getClearRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    };
  }

  setAccessCookie(res: Response, token: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, this.getAccessCookieOptions());
  }

  setRefreshCookie(res: Response, token: string): void {
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      token,
      this.getRefreshCookieOptions(),
    );
  }

  clearAccessCookie(res: Response): void {
    res.clearCookie(
      ACCESS_TOKEN_COOKIE_NAME,
      this.getClearAccessCookieOptions(),
    );
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      this.getClearRefreshCookieOptions(),
    );
  }

  clearAuthCookies(res: Response): void {
    this.clearRefreshCookie(res);
    this.clearAccessCookie(res);
  }

  getAccessToken(req: Request): string | undefined {
    return req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] as string | undefined;
  }

  getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
  }
}
