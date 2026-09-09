import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function getCorsOptions(configService: ConfigService): CorsOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  let allowedOrigins: string[];

  if (isProduction) {
    // In production, permit strictly the configured FRONTEND_URL.
    // Development localhost origins are excluded unless explicitly specified in FRONTEND_URL.
    // Fails closed (empty list) if FRONTEND_URL is missing.
    allowedOrigins = frontendUrl ? [frontendUrl] : [];
  } else {
    // In development / test, permit local development origins required by the project.
    allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
      allowedOrigins.push(frontendUrl);
    }
  }

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
}
