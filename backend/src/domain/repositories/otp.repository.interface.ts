import { OtpEntity } from '../entities/otp.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IOtpRepository extends IBaseRepository<OtpEntity> {
  findByEmail(email: string): Promise<OtpEntity | null>;
  deleteByEmail(email: string): Promise<void>;
  updateAttempts(email: string, attempts: number): Promise<OtpEntity | null>;
}

export const IOtpRepository = Symbol('IOtpRepository');
