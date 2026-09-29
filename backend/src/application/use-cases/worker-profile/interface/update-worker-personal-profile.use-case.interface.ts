import { UpdateWorkerPersonalProfileInputDto } from '../../../dto/worker-profile/update-worker-personal-profile-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';

export interface IUpdateWorkerPersonalProfileUseCase {
  execute(
    userId: string,
    dto: UpdateWorkerPersonalProfileInputDto,
  ): Promise<UserResponseDto>;
}

export const IUpdateWorkerPersonalProfileUseCase = Symbol(
  'IUpdateWorkerPersonalProfileUseCase',
);
