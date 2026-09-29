import { ChangePasswordInputDto } from '../../../dto/auth/change-password-input.dto';

export interface IChangePasswordUseCase {
  execute(
    userId: string,
    data: ChangePasswordInputDto,
  ): Promise<{ message: string }>;
}

export const IChangePasswordUseCase = Symbol('IChangePasswordUseCase');
