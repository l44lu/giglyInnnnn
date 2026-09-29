import { RecruiterProfileEntity } from '../entities/recruiter-profile.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IRecruiterProfileRepository extends IBaseRepository<RecruiterProfileEntity> {
  findByUserId(userId: string): Promise<RecruiterProfileEntity | null>;
  upsert(
    userId: string,
    data: Partial<RecruiterProfileEntity>,
  ): Promise<RecruiterProfileEntity>;
}

export const IRecruiterProfileRepository = Symbol(
  'IRecruiterProfileRepository',
);
