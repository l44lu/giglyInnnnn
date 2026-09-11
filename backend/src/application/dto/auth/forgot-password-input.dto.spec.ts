import { validate } from 'class-validator';
import { ForgotPasswordInputDto } from './forgot-password-input.dto';

describe('ForgotPasswordInputDto Validation', () => {
  const createDto = (email: string): ForgotPasswordInputDto => {
    const dto = new ForgotPasswordInputDto();
    dto.email = email;
    return dto;
  };

  it('should accept valid email addresses', async () => {
    const validEmails = [
      'user@example.com',
      'user.name+tag@sub.domain.org',
      'worker123@gigly.in',
    ];

    for (const email of validEmails) {
      const dto = createDto(email);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject empty email', async () => {
    const dto = createDto('');
    const errors = await validate(dto);
    const emailError = errors.find((err) => err.property === 'email');

    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isNotEmpty');
  });

  it('should reject malformed email addresses', async () => {
    const invalidEmails = [
      'not-an-email',
      'missing-at-sign.com',
      'user@',
      '@domain.com',
      'user@domain..com',
    ];

    for (const email of invalidEmails) {
      const dto = createDto(email);
      const errors = await validate(dto);
      const emailError = errors.find((err) => err.property === 'email');

      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');
    }
  });
});
