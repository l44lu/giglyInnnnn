import { LogoutInputDto } from '../../../dto/auth/logout-input.dto';

export interface ILogoutUseCase {
  execute(userId: string, data: LogoutInputDto): Promise<{ message: string }>;
}

export const ILogoutUseCase = Symbol('ILogoutUseCase');
