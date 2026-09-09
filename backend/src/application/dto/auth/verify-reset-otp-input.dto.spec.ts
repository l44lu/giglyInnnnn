import { validate } from 'class-validator';
import { VerifyResetOtpInputDto } from './verify-reset-otp-input.dto';

describe('VerifyResetOtpInputDto Validation', () => {
  const createDto = (email: string, otp: string): VerifyResetOtpInputDto => {
    const dto = new VerifyResetOtpInputDto();
    dto.email = email;
    dto.otp = otp;
    return dto;
  };

  describe('Valid Inputs', () => {
    const validOtps = ['000000', '123456', '999999'];

    validOtps.forEach((otp) => {
      it(`should accept valid 6-digit numeric OTP "${otp}" with valid email`, async () => {
        const dto = createDto('valid@example.com', otp);
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('Invalid OTPs', () => {
    const invalidOtps = [
      '',
      '1',
      '123',
      '12345',
      '1234567',
      'abcdef',
      '12abcd',
      ' 123456',
      '123456 ',
      '+123456',
    ];

    invalidOtps.forEach((otp) => {
      it(`should reject invalid OTP "${otp}"`, async () => {
        const dto = createDto('valid@example.com', otp);
        const errors = await validate(dto);
        const otpError = errors.find((err) => err.property === 'otp');

        expect(otpError).toBeDefined();
      });
    });
  });

  describe('Email validation', () => {
    it('should reject invalid email format', async () => {
      const dto = createDto('invalid-email-address', '123456');
      const errors = await validate(dto);
      const emailError = errors.find((err) => err.property === 'email');

      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');
    });
  });
});
