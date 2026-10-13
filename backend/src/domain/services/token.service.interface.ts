import { Role } from '../enums/role.enum';

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class TokenExpiredError extends InvalidTokenError {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RefreshTokenInput {
  sub: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti?: string;
}

export interface RefreshTokenResult {
  token: string;
  expiresAt: Date;
}

export interface ITokenService {
  issueAccessToken(payload: AccessTokenPayload): Promise<string>;
  issueRefreshToken(input: RefreshTokenInput): Promise<RefreshTokenResult>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}

export const ITokenService = Symbol('ITokenService');
