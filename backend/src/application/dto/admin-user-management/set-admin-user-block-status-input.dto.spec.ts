import { validate } from 'class-validator';
import { SetAdminUserBlockStatusInputDto } from './set-admin-user-block-status-input.dto';

describe('SetAdminUserBlockStatusInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<SetAdminUserBlockStatusInputDto>,
  ): SetAdminUserBlockStatusInputDto => {
    return new SetAdminUserBlockStatusInputDto(overrides);
  };

  describe('Valid Boolean Values', () => {
    it('1. should accept isBlocked: true', async () => {
      const dto = createDto({ isBlocked: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('2. should accept isBlocked: false', async () => {
      const dto = createDto({ isBlocked: false });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Invalid or Missing Values', () => {
    it('3. should reject missing/empty isBlocked', async () => {
      const dto = createDto({});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isBlocked');
    });

    it('4. should reject null isBlocked', async () => {
      const dto = createDto({ isBlocked: null as unknown as boolean });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isBlocked');
    });

    it('5. should reject string "true"', async () => {
      const dto = createDto({ isBlocked: 'true' as unknown as boolean });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isBlocked');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('6. should reject string "false"', async () => {
      const dto = createDto({ isBlocked: 'false' as unknown as boolean });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isBlocked');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('7. should reject numeric 1 or 0', async () => {
      const dto1 = createDto({ isBlocked: 1 as unknown as boolean });
      const errors1 = await validate(dto1);
      expect(errors1.length).toBeGreaterThan(0);
      expect(errors1[0].property).toBe('isBlocked');

      const dto0 = createDto({ isBlocked: 0 as unknown as boolean });
      const errors0 = await validate(dto0);
      expect(errors0.length).toBeGreaterThan(0);
      expect(errors0[0].property).toBe('isBlocked');
    });

    it('8. should reject object or array', async () => {
      const dtoObj = createDto({ isBlocked: {} as unknown as boolean });
      const errorsObj = await validate(dtoObj);
      expect(errorsObj.length).toBeGreaterThan(0);

      const dtoArr = createDto({ isBlocked: [] as unknown as boolean });
      const errorsArr = await validate(dtoArr);
      expect(errorsArr.length).toBeGreaterThan(0);
    });
  });

  describe('Constructor Behavior', () => {
    it('9. should instantiate with partial data correctly', () => {
      const dto = new SetAdminUserBlockStatusInputDto({ isBlocked: true });
      expect(dto.isBlocked).toBe(true);
    });

    it('10. should instantiate without data', () => {
      const dto = new SetAdminUserBlockStatusInputDto();
      expect(dto.isBlocked).toBeUndefined();
    });
  });
});
