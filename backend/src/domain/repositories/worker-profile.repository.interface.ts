import { WorkerProfileEntity } from '../entities/worker-profile.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IWorkerProfileRepository extends IBaseRepository<WorkerProfileEntity> {
  findByUserId(userId: string): Promise<WorkerProfileEntity | null>;
  upsert(
    userId: string,
    data: Partial<WorkerProfileEntity>,
  ): Promise<WorkerProfileEntity>;
}

export const IWorkerProfileRepository = Symbol('IWorkerProfileRepository');
