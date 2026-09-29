import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';

export interface IGetWorkerProfileUseCase {
  execute(userId: string): Promise<WorkerProfileResponseDto>;
}

export const IGetWorkerProfileUseCase = Symbol('IGetWorkerProfileUseCase');
