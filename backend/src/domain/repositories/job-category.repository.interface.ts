import { JobCategoryEntity } from '../entities/job-category.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IJobCategoryRepository extends IBaseRepository<JobCategoryEntity> {
  findByName(name: string): Promise<JobCategoryEntity | null>;
}

export const IJobCategoryRepository = Symbol('IJobCategoryRepository');
