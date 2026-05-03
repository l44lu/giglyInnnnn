import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshTokenEntity | null>;
  create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity>;
}

export const IRefreshTokenRepository = Symbol('IRefreshTokenRepository');
