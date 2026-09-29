import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';
import { WorkerProfileMapper } from '../../../mappers/worker-profile.mapper';
import { IGetWorkerProfileUseCase } from '../interface/get-worker-profile.use-case.interface';

@Injectable()
export class GetWorkerProfileUseCase implements IGetWorkerProfileUseCase {
  constructor(
    @Inject(IWorkerProfileRepository)
    private readonly workerProfileRepository: IWorkerProfileRepository,
  ) {}

  async execute(userId: string): Promise<WorkerProfileResponseDto> {
    const profile = await this.workerProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Worker profile not found');
    }

    return WorkerProfileMapper.toResponseDto(profile);
  }
}
