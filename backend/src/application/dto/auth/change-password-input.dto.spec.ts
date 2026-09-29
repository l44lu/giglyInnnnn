import { validate } from 'class-validator';
import { ChangePasswordInputDto } from './change-password-input.dto';

describe('ChangePasswordInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<ChangePasswordInputDto>,
  ): ChangePasswordInputDto => {
    const dto = new ChangePasswordInputDto();
    if (overrides) {
      Object.assign(dto, overrides);
    }
    return dto;
  };

  it('should pass validation when valid current and new passwords (>= 8 chars) are provided', async () => {
    const dto = createDto({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject when currentPassword is missing', async () => {
    const dto = createDto({
      newPassword: 'NewPassword123!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentPassword');
  });

  it('should reject when currentPassword is not a string', async () => {
    const dto = createDto({
      currentPassword: 12345678 as unknown as string,
      newPassword: 'NewPassword123!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentPassword');
  });

  it('should reject when currentPassword is empty string', async () => {
    const dto = createDto({
      currentPassword: '',
      newPassword: 'NewPassword123!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentPassword');
  });

  it('should reject when newPassword is missing', async () => {
    const dto = createDto({
      currentPassword: 'OldPassword123!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('newPassword');
  });

  it('should reject when newPassword is not a string', async () => {
    const dto = createDto({
      currentPassword: 'OldPassword123!',
      newPassword: 12345678 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('newPassword');
  });

  it('should reject when newPassword is shorter than 8 characters', async () => {
    const dto = createDto({
      currentPassword: 'OldPassword123!',
      newPassword: 'short',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('newPassword');
    expect(errors[0].constraints?.minLength).toBe(
      'Password must be at least 8 characters long',
    );
  });
});
