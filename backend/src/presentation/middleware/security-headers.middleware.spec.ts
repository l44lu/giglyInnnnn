import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let configService: ConfigService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeadersMap: Record<string, string>;

  beforeEach(() => {
    setHeadersMap = {};
    mockRequest = {};
    mockResponse = {
      setHeader: jest.fn((name: string, value: string) => {
        setHeadersMap[name] = value;
        return mockResponse as Response;
      }),
    };
    mockNext = jest.fn();
  });

  describe('Common Security Headers (All Environments)', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn().mockReturnValue('development'),
      } as unknown as ConfigService;
      middleware = new SecurityHeadersMiddleware(configService);
    });

    it('should set X-Content-Type-Options to nosniff', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(setHeadersMap['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should set X-Frame-Options to DENY', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY',
      );
      expect(setHeadersMap['X-Frame-Options']).toBe('DENY');
    });

    it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
      expect(setHeadersMap['Referrer-Policy']).toBe(
        'strict-origin-when-cross-origin',
      );
    });

    it('should invoke next function', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment-Aware HSTS Behavior', () => {
    it('should NOT set Strict-Transport-Security in development mode', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          return null;
        }),
      } as unknown as ConfigService;
      middleware = new SecurityHeadersMiddleware(configService);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.anything(),
      );
      expect(setHeadersMap['Strict-Transport-Security']).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT set Strict-Transport-Security when NODE_ENV is undefined or test', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'test';
          return null;
        }),
      } as unknown as ConfigService;
      middleware = new SecurityHeadersMiddleware(configService);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.anything(),
      );
      expect(setHeadersMap['Strict-Transport-Security']).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set Strict-Transport-Security only in production mode without preload/includeSubdomains', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          return null;
        }),
      } as unknown as ConfigService;
      middleware = new SecurityHeadersMiddleware(configService);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000',
      );
      expect(setHeadersMap['Strict-Transport-Security']).toBe(
        'max-age=31536000',
      );
      expect(setHeadersMap['Strict-Transport-Security']).not.toContain(
        'includeSubDomains',
      );
      expect(setHeadersMap['Strict-Transport-Security']).not.toContain(
        'preload',
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
