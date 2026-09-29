import { WorkerSkillResponseDto } from '../../../dto/worker-profile/worker-skill-response.dto';

export interface IGetWorkerSkillsUseCase {
  execute(userId: string): Promise<WorkerSkillResponseDto[]>;
}

export const IGetWorkerSkillsUseCase = Symbol('IGetWorkerSkillsUseCase');
