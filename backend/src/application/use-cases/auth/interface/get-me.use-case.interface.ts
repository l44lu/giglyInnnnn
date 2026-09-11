import { UserResponseDto } from '../../../dto/user/user-response.dto';

export interface IGetMeUseCase {
  execute(userId: string): Promise<UserResponseDto>;
}

export const IGetMeUseCase = Symbol('IGetMeUseCase');
