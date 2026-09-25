import { Injectable, Inject } from '@nestjs/common';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { SkillResponseDto } from '../../../dto/worker-profile/skill-response.dto';
import { SkillMapper } from '../../../mappers/skill.mapper';
import { IGetSkillsCatalogUseCase } from '../interface/get-skills-catalog.use-case.interface';

@Injectable()
export class GetSkillsCatalogUseCase implements IGetSkillsCatalogUseCase {
  constructor(
    @Inject(ISkillRepository)
    private readonly skillRepository: ISkillRepository,
  ) {}

  async execute(): Promise<SkillResponseDto[]> {
    const skills = await this.skillRepository.findAll();
    return skills.map((skill) => SkillMapper.toSkillResponseDto(skill));
  }
}
