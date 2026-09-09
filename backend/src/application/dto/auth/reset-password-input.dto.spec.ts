import { validate } from 'class-validator';
import { ResetPasswordInputDto } from './reset-password-input.dto';

describe('ResetPasswordInputDto Validation', () => {
  const createDto = (
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): ResetPasswordInputDto => {
    const dto = new ResetPasswordInputDto();
    dto.resetToken = resetToken;
    dto.newPassword = newPassword;
    dto.confirmPassword = confirmPassword;
    return dto;
  };

  it('should accept valid inputs with 8+ character password', async () => {
    const dto = createDto('a'.repeat(64), 'SecurePass123!', 'SecurePass123!');
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject password with fewer than 8 characters', async () => {
    const dto = createDto('a'.repeat(64), 'Short1!', 'Short1!');
    const errors = await validate(dto);
    const passwordError = errors.find((err) => err.property === 'newPassword');

    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('minLength');
  });

  it('should reject empty resetToken', async () => {
    const dto = createDto('', 'SecurePass123!', 'SecurePass123!');
    const errors = await validate(dto);
    const tokenError = errors.find((err) => err.property === 'resetToken');

    expect(tokenError).toBeDefined();
    expect(tokenError?.constraints).toHaveProperty('isNotEmpty');
  });

  it('should reject empty confirmPassword', async () => {
    const dto = createDto('a'.repeat(64), 'SecurePass123!', '');
    const errors = await validate(dto);
    const confirmError = errors.find(
      (err) => err.property === 'confirmPassword',
    );

    expect(confirmError).toBeDefined();
    expect(confirmError?.constraints).toHaveProperty('isNotEmpty');
  });
});
