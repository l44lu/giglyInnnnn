import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshTokenEntity> {
  findByToken(token: string): Promise<RefreshTokenEntity | null>;
}

export const IRefreshTokenRepository = Symbol('IRefreshTokenRepository');
