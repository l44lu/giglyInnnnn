import { VerifyOtpInputDto } from '../../../dto/auth/verify-otp-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';

export interface IVerifyOtpAndRegisterUseCase {
  execute(data: VerifyOtpInputDto): Promise<UserResponseDto>;
}

export const IVerifyOtpAndRegisterUseCase = Symbol(
  'IVerifyOtpAndRegisterUseCase',
);
