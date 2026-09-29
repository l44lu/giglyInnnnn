import { SkillEntity } from '../entities/skill.entity';
import { IBaseRepository } from './base.repository.interface';

export interface ISkillRepository extends IBaseRepository<SkillEntity> {
  findByName(name: string): Promise<SkillEntity | null>;
  findByIds(ids: string[]): Promise<SkillEntity[]>;
}

export const ISkillRepository = Symbol('ISkillRepository');
