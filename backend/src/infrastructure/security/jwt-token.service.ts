import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Role } from '../../domain/enums/role.enum';
import {
  ITokenService,
  AccessTokenPayload,
  RefreshTokenInput,
  RefreshTokenPayload,
  RefreshTokenResult,
  InvalidTokenError,
  TokenExpiredError,
} from '../../domain/services/token.service.interface';

export { InvalidTokenError, TokenExpiredError };

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getAccessTokenSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  private getRefreshTokenSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return secret;
  }

  private getIssuer(): string {
    return this.configService.get<string>('JWT_ISSUER') ?? 'gigly-auth';
  }

  private getAudience(): string {
    return this.configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app';
  }

  private getAccessTokenExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h';
  }

  private getRefreshTokenExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  async issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    if (
      !payload ||
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      payload.sub !== payload.sub.trim() ||
      !payload.email ||
      typeof payload.email !== 'string' ||
      payload.email !== payload.email.trim() ||
      !payload.role
    ) {
      throw new InvalidTokenError(
        'Access token payload must contain sub, email, and role',
      );
    }

    const secret = this.getAccessTokenSecret();
    const expiresIn = this.getAccessTokenExpiresIn();
    const issuer = this.getIssuer();
    const audience = this.getAudience();

    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      },
      {
        secret,
        expiresIn: expiresIn as JwtSignOptions['expiresIn'],
        algorithm: 'HS256',
        issuer,
        audience,
      },
    );
  }

  async issueRefreshToken(
    input: RefreshTokenInput,
  ): Promise<RefreshTokenResult> {
    if (
      !input ||
      !input.sub ||
      typeof input.sub !== 'string' ||
      input.sub !== input.sub.trim()
    ) {
      throw new InvalidTokenError('Refresh token input must contain sub');
    }

    const secret = this.getRefreshTokenSecret();
    const expiresIn = this.getRefreshTokenExpiresIn();
    const issuer = this.getIssuer();
    const audience = this.getAudience();
    const jti = crypto.randomUUID();

    const token = await this.jwtService.signAsync(
      { sub: input.sub },
      {
        secret,
        expiresIn: expiresIn as JwtSignOptions['expiresIn'],
        algorithm: 'HS256',
        jwtid: jti,
        issuer,
        audience,
      },
    );

    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    let expiresAt: Date;
    if (decoded && typeof decoded.exp === 'number') {
      expiresAt = new Date(decoded.exp * 1000);
    } else {
      expiresAt = new Date(Date.now() + this.parseDurationToMs(expiresIn));
    }

    return {
      token,
      expiresAt,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new InvalidTokenError('Access token is missing or empty');
    }

    const secret = this.getAccessTokenSecret();
    const issuer = this.getIssuer();
    const audience = this.getAudience();

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token.trim(),
        {
          secret,
          algorithms: ['HS256'],
          issuer,
          audience,
        },
      );
    } catch (error: any) {
      if (
        error?.name === 'TokenExpiredError' ||
        error?.message?.includes('expired')
      ) {
        throw new TokenExpiredError('Access token has expired');
      }
      if (
        error?.name === 'JsonWebTokenError' ||
        error?.name === 'NotBeforeError' ||
        error?.message?.includes('jwt') ||
        error?.message?.includes('token') ||
        error?.message?.includes('signature') ||
        error?.message?.includes('algorithm') ||
        error?.message?.includes('issuer') ||
        error?.message?.includes('audience')
      ) {
        throw new InvalidTokenError('Invalid access token');
      }
      throw error;
    }

    if (
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      payload.sub !== payload.sub.trim()
    ) {
      throw new InvalidTokenError('Access token payload has invalid sub');
    }
    if (
      !payload.email ||
      typeof payload.email !== 'string' ||
      payload.email !== payload.email.trim()
    ) {
      throw new InvalidTokenError('Access token payload has invalid email');
    }
    const validRoles = Object.values(Role) as string[];
    if (
      !payload.role ||
      typeof payload.role !== 'string' ||
      !validRoles.includes(payload.role)
    ) {
      throw new InvalidTokenError('Access token payload has invalid role');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as Role,
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new InvalidTokenError('Refresh token is missing or empty');
    }

    const secret = this.getRefreshTokenSecret();
    const issuer = this.getIssuer();
    const audience = this.getAudience();

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token.trim(),
        {
          secret,
          algorithms: ['HS256'],
          issuer,
          audience,
        },
      );
    } catch (error: any) {
      if (
        error?.name === 'TokenExpiredError' ||
        error?.message?.includes('expired')
      ) {
        throw new TokenExpiredError('Refresh token has expired');
      }
      if (
        error?.name === 'JsonWebTokenError' ||
        error?.name === 'NotBeforeError' ||
        error?.message?.includes('jwt') ||
        error?.message?.includes('token') ||
        error?.message?.includes('signature') ||
        error?.message?.includes('algorithm') ||
        error?.message?.includes('issuer') ||
        error?.message?.includes('audience')
      ) {
        throw new InvalidTokenError('Invalid refresh token');
      }
      throw error;
    }

    if (
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      payload.sub !== payload.sub.trim()
    ) {
      throw new InvalidTokenError('Refresh token payload has invalid sub');
    }

    const result: RefreshTokenPayload = {
      sub: payload.sub,
    };

    if (payload.jti !== undefined) {
      if (
        typeof payload.jti !== 'string' ||
        !payload.jti ||
        payload.jti !== payload.jti.trim()
      ) {
        throw new InvalidTokenError('Refresh token payload has invalid jti');
      }
      result.jti = payload.jti;
    }

    return result;
  }
}
