import { SkillEntity } from '../../domain/entities/skill.entity';
import { WorkerSkillEntity } from '../../domain/entities/worker-skill.entity';
import { SkillResponseDto } from '../dto/worker-profile/skill-response.dto';
import { WorkerSkillResponseDto } from '../dto/worker-profile/worker-skill-response.dto';

export class SkillMapper {
  static toSkillResponseDto(skill: SkillEntity): SkillResponseDto {
    return new SkillResponseDto({
      id: skill.id,
      name: skill.name,
    });
  }

  static toWorkerSkillResponseDto(
    workerSkill: WorkerSkillEntity,
  ): WorkerSkillResponseDto {
    return new WorkerSkillResponseDto({
      id: workerSkill.id,
      skillId: workerSkill.skillId,
      skillName: workerSkill.skill?.name ?? '',
    });
  }
}
