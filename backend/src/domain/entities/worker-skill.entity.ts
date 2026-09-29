import { SkillEntity } from './skill.entity';

export class WorkerSkillEntity {
  id!: string;
  workerId!: string;
  skillId!: string;
  skillType: string = 'CORE';
  skill?: SkillEntity;

  constructor(partial?: Partial<WorkerSkillEntity>) {
    Object.assign(this, partial);
    if (this.skillType === undefined) {
      this.skillType = 'CORE';
    }
  }
}
