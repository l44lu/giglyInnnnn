import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import {
  getTrustProxySetting,
  configureTrustProxy,
} from './trust-proxy.config';

describe('trust-proxy.config', () => {
  const createMockConfigService = (val?: string): ConfigService => {
    return {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'TRUST_PROXY') {
          return val;
        }
        return undefined;
      }),
    } as unknown as ConfigService;
  };

  describe('getTrustProxySetting (Safe Default & Parsing)', () => {
    it('should default to false when TRUST_PROXY is undefined', () => {
      const configService = createMockConfigService(undefined);
      expect(getTrustProxySetting(configService)).toBe(false);
    });

    it('should default to false when TRUST_PROXY is empty string or whitespace', () => {
      expect(getTrustProxySetting(createMockConfigService(''))).toBe(false);
      expect(getTrustProxySetting(createMockConfigService('   '))).toBe(false);
    });

    it('should return boolean false for "false", "0", "off", "no" regardless of casing', () => {
      expect(getTrustProxySetting(createMockConfigService('false'))).toBe(
        false,
      );
      expect(getTrustProxySetting(createMockConfigService('FALSE'))).toBe(
        false,
      );
      expect(getTrustProxySetting(createMockConfigService('False'))).toBe(
        false,
      );
      expect(getTrustProxySetting(createMockConfigService('0'))).toBe(false);
      expect(getTrustProxySetting(createMockConfigService('off'))).toBe(false);
      expect(getTrustProxySetting(createMockConfigService('no'))).toBe(false);
    });

    it('should return boolean true for "true" or "yes" regardless of casing', () => {
      expect(getTrustProxySetting(createMockConfigService('true'))).toBe(true);
      expect(getTrustProxySetting(createMockConfigService('TRUE'))).toBe(true);
      expect(getTrustProxySetting(createMockConfigService('True'))).toBe(true);
      expect(getTrustProxySetting(createMockConfigService('yes'))).toBe(true);
    });

    it('should return parsed integer for digit strings (hop counts)', () => {
      expect(getTrustProxySetting(createMockConfigService('1'))).toBe(1);
      expect(getTrustProxySetting(createMockConfigService('2'))).toBe(2);
      expect(getTrustProxySetting(createMockConfigService(' 3 '))).toBe(3);
    });

    it('should return trimmed string for custom proxy values (subnets, CIDRs, keywords)', () => {
      expect(getTrustProxySetting(createMockConfigService('loopback'))).toBe(
        'loopback',
      );
      expect(getTrustProxySetting(createMockConfigService('10.0.0.0/8'))).toBe(
        '10.0.0.0/8',
      );
      expect(
        getTrustProxySetting(createMockConfigService('linklocal, uniquelocal')),
      ).toBe('linklocal, uniquelocal');
    });
  });

  describe('configureTrustProxy', () => {
    it('should apply the resolved setting to the Express instance', () => {
      const setMock = jest.fn();
      const mockApp = {
        getHttpAdapter: () => ({
          getInstance: () => ({
            set: setMock,
          }),
        }),
      } as unknown as INestApplication;

      const configService = createMockConfigService('1');
      configureTrustProxy(mockApp, configService);

      expect(setMock).toHaveBeenCalledWith('trust proxy', 1);
    });

    it('should apply false to the Express instance when TRUST_PROXY is unset', () => {
      const setMock = jest.fn();
      const mockApp = {
        getHttpAdapter: () => ({
          getInstance: () => ({
            set: setMock,
          }),
        }),
      } as unknown as INestApplication;

      const configService = createMockConfigService(undefined);
      configureTrustProxy(mockApp, configService);

      expect(setMock).toHaveBeenCalledWith('trust proxy', false);
    });
  });
});
