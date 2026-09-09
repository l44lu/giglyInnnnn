import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TrustProxySetting = boolean | number | string;

/**
 * Resolves the Express 'trust proxy' setting from ConfigService.
 *
 * Supported values:
 * - Unset / undefined / empty string -> false (safe default: direct connection, ignores X-Forwarded-For)
 * - "false" / "0" / "off" / "no" -> false
 * - "true" / "yes" -> true (trusts all hops; only for trusted reverse proxy)
 * - Digit string (e.g. "1", "2") -> parsed integer hop count
 * - Custom string (e.g. "loopback", "10.0.0.0/8", comma-separated list) -> string passed directly to Express
 */
export function getTrustProxySetting(
  configService: ConfigService,
): TrustProxySetting {
  const raw = configService.get<string>('TRUST_PROXY');
  if (!raw) {
    return false;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no') {
    return false;
  }

  if (lower === 'true' || lower === 'yes') {
    return true;
  }

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return trimmed;
}

/**
 * Applies the resolved 'trust proxy' setting to the underlying Express application.
 */
export function configureTrustProxy(
  app: INestApplication,
  configService: ConfigService,
): void {
  const setting = getTrustProxySetting(configService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', setting);
}
