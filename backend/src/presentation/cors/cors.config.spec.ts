import { getCorsOptions } from './cors.config';
import { ConfigService } from '@nestjs/config';

describe('getCorsOptions', () => {
  let configService: ConfigService;

  describe('Development Environment (NODE_ENV !== "production")', () => {
    it('should allow default localhost and 127.0.0.1 origins when FRONTEND_URL is not set', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'FRONTEND_URL') return undefined;
          return null;
        }),
      } as unknown as ConfigService;

      const options = getCorsOptions(configService);
      expect(options.origin).toEqual([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]);
      expect(options.credentials).toBe(true);
      expect(options.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ]);
      expect(options.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'X-Requested-With',
      ]);
    });

    it('should append FRONTEND_URL to localhost origins when defined in development', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'FRONTEND_URL') return 'http://custom-dev:5173';
          return null;
        }),
      } as unknown as ConfigService;

      const options = getCorsOptions(configService);
      expect(options.origin).toEqual([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://custom-dev:5173',
      ]);
    });

    it('should not duplicate origin if FRONTEND_URL matches localhost in development', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'FRONTEND_URL') return 'http://localhost:5173';
          return null;
        }),
      } as unknown as ConfigService;

      const options = getCorsOptions(configService);
      expect(options.origin).toEqual([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]);
    });
  });

  describe('Production Environment (NODE_ENV === "production")', () => {
    it('should allow strictly FRONTEND_URL and exclude localhost development origins', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'FRONTEND_URL') return 'https://app.gigly.com';
          return null;
        }),
      } as unknown as ConfigService;

      const options = getCorsOptions(configService);
      expect(options.origin).toEqual(['https://app.gigly.com']);
      expect(options.origin).not.toContain('http://localhost:5173');
      expect(options.origin).not.toContain('http://127.0.0.1:5173');
      expect(options.credentials).toBe(true);
      expect(options.methods).toBeDefined();
    });

    it('should fail closed with an empty origin list if FRONTEND_URL is missing in production', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'FRONTEND_URL') return undefined;
          return null;
        }),
      } as unknown as ConfigService;

      const options = getCorsOptions(configService);
      expect(options.origin).toEqual([]);
      expect(options.origin).not.toContain('http://localhost:5173');
    });

    it('should never contain wildcard * as origin in any environment', () => {
      const devConfig = {
        get: jest.fn().mockReturnValue('development'),
      } as unknown as ConfigService;
      const prodConfig = {
        get: jest.fn((k) => (k === 'NODE_ENV' ? 'production' : '*')),
      } as unknown as ConfigService;

      const devOptions = getCorsOptions(devConfig);
      const prodOptions = getCorsOptions(prodConfig);

      expect(devOptions.origin).not.toBe('*');
      expect(prodOptions.origin).not.toBe('*');
      expect(devOptions.origin).not.toContain('*');
    });
  });
});
