export interface IOtpHashingService {
  hashOtp(otp: string): string;
}

export const IOtpHashingService = Symbol('IOtpHashingService');
