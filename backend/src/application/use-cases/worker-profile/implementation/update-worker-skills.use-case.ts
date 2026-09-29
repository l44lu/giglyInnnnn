import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { IWorkerSkillRepository } from '../../../../domain/repositories/worker-skill.repository.interface';
import { UpdateWorkerSkillsInputDto } from '../../../dto/worker-profile/update-worker-skills-input.dto';
import { WorkerSkillResponseDto } from '../../../dto/worker-profile/worker-skill-response.dto';
import { SkillMapper } from '../../../mappers/skill.mapper';
import { IUpdateWorkerSkillsUseCase } from '../interface/update-worker-skills.use-case.interface';

@Injectable()
export class UpdateWorkerSkillsUseCase implements IUpdateWorkerSkillsUseCase {
  constructor(
    @Inject(IWorkerProfileRepository)
    private readonly workerProfileRepository: IWorkerProfileRepository,
    @Inject(ISkillRepository)
    private readonly skillRepository: ISkillRepository,
    @Inject(IWorkerSkillRepository)
    private readonly workerSkillRepository: IWorkerSkillRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateWorkerSkillsInputDto,
  ): Promise<WorkerSkillResponseDto[]> {
    // 1. Validate against duplicate skill IDs
    const uniqueIds = new Set(dto.skillIds);
    if (uniqueIds.size !== dto.skillIds.length) {
      throw new BadRequestException('Duplicate skill IDs are not allowed');
    }

    // 2. Validate worker profile existence
    const profile = await this.workerProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Worker profile not found');
    }

    // 3. If skills are selected, validate that every ID exists in the catalog
    if (dto.skillIds.length > 0) {
      const existingSkills = await this.skillRepository.findByIds(dto.skillIds);
      if (existingSkills.length !== dto.skillIds.length) {
        const foundIds = new Set(existingSkills.map((s) => s.id));
        const missingIds = dto.skillIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `One or more selected skills do not exist: ${missingIds.join(', ')}`,
        );
      }
    }

    // 4. Atomically replace worker skills (preserves existing, removes deselected, adds new)
    const updated = await this.workerSkillRepository.replaceForWorker(
      profile.id,
      dto.skillIds,
    );

    return updated.map((ws) => SkillMapper.toWorkerSkillResponseDto(ws));
  }
}
