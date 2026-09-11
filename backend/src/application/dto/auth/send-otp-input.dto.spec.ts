import { validate } from 'class-validator';
import { Role } from '@prisma/client';
import { SendOtpInputDto } from './send-otp-input.dto';

describe('SendOtpInputDto Role Validation', () => {
  const createDto = (role?: any): SendOtpInputDto => {
    const dto = new SendOtpInputDto();
    dto.email = 'applicant@example.com';
    dto.password = 'SecurePassword123!';
    dto.firstName = 'Jane';
    dto.lastName = 'Doe';
    if (role !== undefined) {
      dto.role = role;
    }
    return dto;
  };

  describe('Allowed Public Roles', () => {
    it('should accept WORKER role', async () => {
      const dto = createDto(Role.WORKER);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept RECRUITER role', async () => {
      const dto = createDto(Role.RECRUITER);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept omitted/undefined role (defaults gracefully)', async () => {
      const dto = createDto(undefined);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Forbidden / Privileged Roles', () => {
    it('should REJECT ADMIN role with a clear validation message', async () => {
      const dto = createDto(Role.ADMIN);
      const errors = await validate(dto);
      const roleError = errors.find((err) => err.property === 'role');

      expect(roleError).toBeDefined();
      expect(roleError?.constraints).toHaveProperty('isIn');
      expect(roleError?.constraints?.isIn).toBe(
        'Role must be either WORKER or RECRUITER',
      );
    });

    it('should REJECT arbitrary unrecognized role strings', async () => {
      const dto = createDto('SUPERADMIN');
      const errors = await validate(dto);
      const roleError = errors.find((err) => err.property === 'role');

      expect(roleError).toBeDefined();
      expect(roleError?.constraints).toHaveProperty('isIn');
    });
  });
});
