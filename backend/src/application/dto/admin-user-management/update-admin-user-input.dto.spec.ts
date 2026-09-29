import { validate } from 'class-validator';
import { UpdateAdminUserInputDto } from './update-admin-user-input.dto';

describe('UpdateAdminUserInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<UpdateAdminUserInputDto>,
  ): UpdateAdminUserInputDto => {
    return new UpdateAdminUserInputDto(overrides);
  };

  it('1. should pass validation when all fields are omitted (valid partial update)', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('2. should pass validation when all 6 approved fields are valid strings', async () => {
    const dto = createDto({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+14155551234',
      location: 'San Francisco, CA',
      bio: 'Senior software consultant',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('3. should pass validation when nullable fields are set to null', async () => {
    const dto = createDto({
      firstName: 'Jane',
      phone: null,
      location: null,
      bio: null,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('4. should pass validation when only a single field is updated', async () => {
    const dto = createDto({
      bio: 'Updated bio description',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('5. should reject invalid email format', async () => {
    const dto = createDto({
      email: 'invalid-email-address',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('6. should reject non-string firstName', async () => {
    const dto = createDto({
      firstName: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('firstName');
  });

  it('7. should reject non-string lastName', async () => {
    const dto = createDto({
      lastName: true as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('lastName');
  });

  it('8. should reject non-string phone when not null', async () => {
    const dto = createDto({
      phone: 123456 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phone');
  });

  it('9. should reject non-string location when not null', async () => {
    const dto = createDto({
      location: { city: 'New York' } as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('location');
  });

  it('10. should reject non-string bio when not null', async () => {
    const dto = createDto({
      bio: ['bio line 1'] as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('bio');
  });

  it('11. should reject unapproved fields when forbidNonWhitelisted is active', async () => {
    const dto = createDto({
      firstName: 'Jane',
    });
    (dto as Record<string, unknown>).role = 'ADMIN';
    (dto as Record<string, unknown>).isBlocked = true;
    (dto as Record<string, unknown>).passwordHash = 'new-hash';
    (dto as Record<string, unknown>).id = 'uuid-fake';

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    const rejectedProps = errors.map((e) => e.property);
    expect(rejectedProps).toContain('role');
    expect(rejectedProps).toContain('isBlocked');
    expect(rejectedProps).toContain('passwordHash');
    expect(rejectedProps).toContain('id');
  });
});
