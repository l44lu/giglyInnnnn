import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshTokenEntity> {
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  findByToken(token: string): Promise<RefreshTokenEntity | null>;
  deleteByTokenHash(tokenHash: string): Promise<boolean>;
  rotate(
    oldTokenHash: string,
    newTokenData: Partial<RefreshTokenEntity>,
  ): Promise<boolean>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const IRefreshTokenRepository = Symbol('IRefreshTokenRepository');
