import { Injectable, Inject } from '@nestjs/common';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { UpdateWorkerProfileInputDto } from '../../../dto/worker-profile/update-worker-profile-input.dto';
import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';
import { WorkerProfileMapper } from '../../../mappers/worker-profile.mapper';
import { IUpdateWorkerProfileUseCase } from '../interface/update-worker-profile.use-case.interface';

@Injectable()
export class UpdateWorkerProfileUseCase implements IUpdateWorkerProfileUseCase {
  constructor(
    @Inject(IWorkerProfileRepository)
    private readonly workerProfileRepository: IWorkerProfileRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateWorkerProfileInputDto,
  ): Promise<WorkerProfileResponseDto> {
    const updatedProfile = await this.workerProfileRepository.upsert(userId, {
      ...(dto.headline !== undefined && { headline: dto.headline }),
      ...(dto.yearsExperience !== undefined && {
        yearsExperience: dto.yearsExperience,
      }),
      ...(dto.responseTimeHours !== undefined && {
        responseTimeHours: dto.responseTimeHours,
      }),
      ...(dto.availabilityStatus !== undefined && {
        availabilityStatus: dto.availabilityStatus,
      }),
      ...(dto.isOpenToWork !== undefined && {
        isOpenToWork: dto.isOpenToWork,
      }),
    });

    return WorkerProfileMapper.toResponseDto(updatedProfile);
  }
}
