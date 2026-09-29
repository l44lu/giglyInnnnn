import { UpdateWorkerSkillsInputDto } from '../../../dto/worker-profile/update-worker-skills-input.dto';
import { WorkerSkillResponseDto } from '../../../dto/worker-profile/worker-skill-response.dto';

export interface IUpdateWorkerSkillsUseCase {
  execute(
    userId: string,
    dto: UpdateWorkerSkillsInputDto,
  ): Promise<WorkerSkillResponseDto[]>;
}

export const IUpdateWorkerSkillsUseCase = Symbol('IUpdateWorkerSkillsUseCase');
