import { VerifyResetOtpInputDto } from '../../../dto/auth/verify-reset-otp-input.dto';

export interface IVerifyPasswordResetOtpUseCase {
  execute(
    data: VerifyResetOtpInputDto,
  ): Promise<{ resetToken: string; message: string }>;
}

export const IVerifyPasswordResetOtpUseCase = Symbol(
  'IVerifyPasswordResetOtpUseCase',
);
