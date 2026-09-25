import { UpdateWorkerProfileInputDto } from '../../../dto/worker-profile/update-worker-profile-input.dto';
import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';

export interface IUpdateWorkerProfileUseCase {
  execute(
    userId: string,
    dto: UpdateWorkerProfileInputDto,
  ): Promise<WorkerProfileResponseDto>;
}

export const IUpdateWorkerProfileUseCase = Symbol(
  'IUpdateWorkerProfileUseCase',
);
