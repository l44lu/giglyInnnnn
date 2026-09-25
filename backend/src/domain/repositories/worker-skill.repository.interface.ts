import { WorkerSkillEntity } from '../entities/worker-skill.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IWorkerSkillRepository extends IBaseRepository<WorkerSkillEntity> {
  findByWorkerId(workerId: string): Promise<WorkerSkillEntity[]>;
  findByWorkerAndSkill(
    workerId: string,
    skillId: string,
  ): Promise<WorkerSkillEntity | null>;
  deleteByWorkerAndSkill(workerId: string, skillId: string): Promise<boolean>;
  replaceForWorker(
    workerId: string,
    skillIds: string[],
  ): Promise<WorkerSkillEntity[]>;
}

export const IWorkerSkillRepository = Symbol('IWorkerSkillRepository');
