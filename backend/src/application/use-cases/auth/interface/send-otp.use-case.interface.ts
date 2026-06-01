import { SendOtpInputDto } from '../../../dto/auth/send-otp-input.dto';

export interface ISendOtpUseCase {
  execute(data: SendOtpInputDto): Promise<{ message: string }>;
}

export const ISendOtpUseCase = Symbol('ISendOtpUseCase');
