import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Helmet use akanam enn ind but experience illathond manually sett akiyatha eni nale eneechit enthinanavo enn choykarth, imp points are mentioned below use it twin
    // HSTS is strictly environment-aware: only emit when NODE_ENV is 'production'.
    // ASSUMPTION: Production traffic is served over HTTPS. NODE_ENV=production itself does not verify HTTPS.
    // In local development over HTTP, HSTS is omitted to prevent invalid STS policies on local connections.
    // Note: includeSubDomains and preload are intentionally omitted as no verified requirement exists.
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }

    next();
  }
}
