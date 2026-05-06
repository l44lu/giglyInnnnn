import { LoginInputDto } from '../../../dto/auth/login-input.dto';
import { AuthResponseDto } from '../../../dto/auth/auth-response.dto';

export interface ILoginUseCase {
  execute(data: LoginInputDto): Promise<AuthResponseDto>;
}

export const ILoginUseCase = Symbol('ILoginUseCase');
