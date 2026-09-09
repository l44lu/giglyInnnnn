import { ForgotPasswordInputDto } from '../../../dto/auth/forgot-password-input.dto';

export interface IForgotPasswordUseCase {
  execute(data: ForgotPasswordInputDto): Promise<{ message: string }>;
}

export const IForgotPasswordUseCase = Symbol('IForgotPasswordUseCase');
