import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { IBaseRepository } from './base.repository.interface';

export interface RotateRefreshTokenData {
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IRefreshTokenRepository extends IBaseRepository<RefreshTokenEntity> {
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  deleteByTokenHash(tokenHash: string): Promise<boolean>;
  rotate(
    oldTokenHash: string,
    newTokenData: RotateRefreshTokenData,
    reason?: string,
  ): Promise<boolean>;
  revokeSession(sessionId: string, reason?: string): Promise<void>;
  revokeAllForUser(userId: string, reason?: string): Promise<void>;
}

export const IRefreshTokenRepository = Symbol('IRefreshTokenRepository');
