import { SkillResponseDto } from '../../../dto/worker-profile/skill-response.dto';

export interface IGetSkillsCatalogUseCase {
  execute(): Promise<SkillResponseDto[]>;
}

export const IGetSkillsCatalogUseCase = Symbol('IGetSkillsCatalogUseCase');
