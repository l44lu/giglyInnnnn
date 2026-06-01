export interface IEmailService {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

export const IEmailService = Symbol('IEmailService');
