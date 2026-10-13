import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  AuthCookieService,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  ACCESS_COOKIE_PATH,
  REFRESH_COOKIE_PATH,
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
} from './auth-cookie.service';

describe('AuthCookieService', () => {
  let service: AuthCookieService;
  let configService: jest.Mocked<ConfigService>;
  let mockRes: jest.Mocked<Response>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthCookieService(configService);

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  });

  describe('Cookie Options in Development', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('development');
    });

    it('should construct correct access cookie options with secure: false', () => {
      const options = service.getAccessCookieOptions();
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: ACCESS_COOKIE_PATH,
        maxAge: ACCESS_COOKIE_MAX_AGE_MS,
      });
    });

    it('should construct correct clear access cookie options with secure: false', () => {
      const options = service.getClearAccessCookieOptions();
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: ACCESS_COOKIE_PATH,
      });
    });

    it('should construct correct refresh cookie options with secure: false', () => {
      const options = service.getRefreshCookieOptions();
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      });
    });

    it('should construct correct clear refresh cookie options with secure: false', () => {
      const options = service.getClearRefreshCookieOptions();
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
      });
    });
  });

  describe('Cookie Options in Production', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('production');
    });

    it('should construct access cookie options with secure: true', () => {
      const options = service.getAccessCookieOptions();
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(3600000);
    });

    it('should construct refresh cookie options with secure: true', () => {
      const options = service.getRefreshCookieOptions();
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/auth');
      expect(options.maxAge).toBe(604800000);
    });
  });

  describe('Cookie Write Operations', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('development');
    });

    it('should set access cookie with correct name and options', () => {
      service.setAccessCookie(mockRes, 'access-token-xyz');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'access-token-xyz',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/',
          maxAge: 3600000,
        },
      );
    });

    it('should set refresh cookie with correct name and options', () => {
      service.setRefreshCookie(mockRes, 'refresh-token-xyz');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN_COOKIE_NAME,
        'refresh-token-xyz',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/auth',
          maxAge: 604800000,
        },
      );
    });
  });

  describe('Cookie Clear Operations', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('development');
    });

    it('should clear access cookie with matching path', () => {
      service.clearAccessCookie(mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/',
        },
      );
    });

    it('should clear refresh cookie with matching path', () => {
      service.clearRefreshCookie(mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        REFRESH_TOKEN_COOKIE_NAME,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/auth',
        },
      );
    });

    it('should clear both cookies via clearAuthCookies with exact matching paths', () => {
      service.clearAuthCookies(mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockRes.clearCookie).toHaveBeenNthCalledWith(
        1,
        REFRESH_TOKEN_COOKIE_NAME,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/auth',
        },
      );
      expect(mockRes.clearCookie).toHaveBeenNthCalledWith(
        2,
        ACCESS_TOKEN_COOKIE_NAME,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/',
        },
      );
    });
  });

  describe('Cookie Read Operations', () => {
    it('should extract access token from request cookies', () => {
      const req = {
        cookies: { [ACCESS_TOKEN_COOKIE_NAME]: 'extracted-access-token' },
      } as unknown as Request;
      expect(service.getAccessToken(req)).toBe('extracted-access-token');
    });

    it('should return undefined when access cookie is not present', () => {
      const req = { cookies: {} } as unknown as Request;
      expect(service.getAccessToken(req)).toBeUndefined();
    });

    it('should extract refresh token from request cookies', () => {
      const req = {
        cookies: { [REFRESH_TOKEN_COOKIE_NAME]: 'extracted-refresh-token' },
      } as unknown as Request;
      expect(service.getRefreshToken(req)).toBe('extracted-refresh-token');
    });

    it('should return undefined when refresh cookie is not present', () => {
      const req = { cookies: {} } as unknown as Request;
      expect(service.getRefreshToken(req)).toBeUndefined();
    });

    it('should handle undefined req.cookies gracefully', () => {
      const req = {} as unknown as Request;
      expect(service.getAccessToken(req)).toBeUndefined();
      expect(service.getRefreshToken(req)).toBeUndefined();
    });
  });
});
