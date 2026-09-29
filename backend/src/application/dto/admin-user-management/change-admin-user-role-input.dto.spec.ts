import { validate } from 'class-validator';
import { Role } from '../../../domain/enums/role.enum';
import { ChangeAdminUserRoleInputDto } from './change-admin-user-role-input.dto';

describe('ChangeAdminUserRoleInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<ChangeAdminUserRoleInputDto>,
  ): ChangeAdminUserRoleInputDto => {
    return new ChangeAdminUserRoleInputDto(overrides);
  };

  describe('Allowed Role Values', () => {
    it('1. should accept ADMIN role', async () => {
      const dto = createDto({ role: Role.ADMIN });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('2. should accept WORKER role', async () => {
      const dto = createDto({ role: Role.WORKER });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('3. should accept RECRUITER role', async () => {
      const dto = createDto({ role: Role.RECRUITER });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Invalid Role Values', () => {
    it('4. should reject unrecognized role strings', async () => {
      const dto = createDto({ role: 'SUPERADMIN' as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('5. should reject lowercase role strings', async () => {
      const dto = createDto({ role: 'admin' as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('6. should reject non-string role types (number)', async () => {
      const dto = createDto({ role: 12345 as unknown as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('7. should reject non-string role types (boolean)', async () => {
      const dto = createDto({ role: true as unknown as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });
  });

  describe('Missing or Empty Role Values', () => {
    it('8. should reject omitted / undefined role', async () => {
      const dto = createDto();
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
    });

    it('9. should reject null role', async () => {
      const dto = createDto({ role: null as unknown as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
    });

    it('10. should reject empty string role', async () => {
      const dto = createDto({ role: '' as Role });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
    });
  });

  describe('Unapproved Fields with forbidNonWhitelisted', () => {
    it('11. should reject unapproved fields when forbidNonWhitelisted is active', async () => {
      const dto = createDto({ role: Role.ADMIN });
      const target = dto as unknown as Record<string, unknown>;
      target.userId = 'target-user-uuid';
      target.email = 'user@example.com';
      target.firstName = 'John';
      target.lastName = 'Doe';
      target.phone = '+1234567890';
      target.location = 'New York';
      target.bio = 'Some bio';
      target.isActive = true;
      target.isBlocked = false;
      target.passwordHash = 'hash-secret';

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors.length).toBeGreaterThan(0);
      const rejectedProps = errors.map((e) => e.property);
      expect(rejectedProps).toContain('userId');
      expect(rejectedProps).toContain('email');
      expect(rejectedProps).toContain('firstName');
      expect(rejectedProps).toContain('lastName');
      expect(rejectedProps).toContain('phone');
      expect(rejectedProps).toContain('location');
      expect(rejectedProps).toContain('bio');
      expect(rejectedProps).toContain('isActive');
      expect(rejectedProps).toContain('isBlocked');
      expect(rejectedProps).toContain('passwordHash');
    });
  });
});
