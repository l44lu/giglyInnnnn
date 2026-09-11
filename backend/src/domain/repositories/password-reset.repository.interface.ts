import { PasswordResetEntity } from '../entities/password-reset.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IPasswordResetRepository extends IBaseRepository<PasswordResetEntity> {
  findByUserId(userId: string): Promise<PasswordResetEntity | null>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetEntity | null>;
  updateAttempts(id: string, attempts: number): Promise<void>;
  setTokenHash(id: string, tokenHash: string): Promise<void>;
  consumeOtpAndSetTokenHash(
    id: string,
    tokenHash: string,
    expiresAt?: Date,
  ): Promise<boolean>;
  deleteByUserId(userId: string): Promise<void>;
}

export const IPasswordResetRepository = Symbol('IPasswordResetRepository');
