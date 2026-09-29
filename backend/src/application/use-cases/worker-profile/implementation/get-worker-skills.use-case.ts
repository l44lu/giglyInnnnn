import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { IWorkerSkillRepository } from '../../../../domain/repositories/worker-skill.repository.interface';
import { WorkerSkillResponseDto } from '../../../dto/worker-profile/worker-skill-response.dto';
import { SkillMapper } from '../../../mappers/skill.mapper';
import { IGetWorkerSkillsUseCase } from '../interface/get-worker-skills.use-case.interface';

@Injectable()
export class GetWorkerSkillsUseCase implements IGetWorkerSkillsUseCase {
  constructor(
    @Inject(IWorkerProfileRepository)
    private readonly workerProfileRepository: IWorkerProfileRepository,
    @Inject(IWorkerSkillRepository)
    private readonly workerSkillRepository: IWorkerSkillRepository,
  ) {}

  async execute(userId: string): Promise<WorkerSkillResponseDto[]> {
    const profile = await this.workerProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Worker profile not found');
    }

    const workerSkills = await this.workerSkillRepository.findByWorkerId(
      profile.id,
    );

    return workerSkills.map((ws) => SkillMapper.toWorkerSkillResponseDto(ws));
  }
}
