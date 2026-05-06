import { RegisterInputDto } from '../../../dto/auth/register-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';
export interface IRegisterUseCase {
  execute(data: RegisterInputDto): Promise<UserResponseDto>;
}

export const IRegisterUseCase = Symbol('IRegisterUseCase');
