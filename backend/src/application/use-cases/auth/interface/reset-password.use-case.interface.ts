import { ResetPasswordInputDto } from '../../../dto/auth/reset-password-input.dto';

export interface IResetPasswordUseCase {
  execute(data: ResetPasswordInputDto): Promise<{ message: string }>;
}

export const IResetPasswordUseCase = Symbol('IResetPasswordUseCase');
