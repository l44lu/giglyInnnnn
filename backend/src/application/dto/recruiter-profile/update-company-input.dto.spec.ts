import { validate } from 'class-validator';
import { UpdateCompanyInputDto } from './update-company-input.dto';

describe('UpdateCompanyInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<UpdateCompanyInputDto>,
  ): UpdateCompanyInputDto => {
    const dto = new UpdateCompanyInputDto();
    if (overrides) {
      Object.assign(dto, overrides);
    }
    return dto;
  };

  it('should pass validation when all fields are omitted (valid partial update)', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation when valid values are provided', async () => {
    const dto = createDto({
      name: 'Acme Corporation',
      industry: 'Technology',
      companySize: '100-500',
      website: 'https://acme.example.com',
      headquartersLocation: 'San Francisco, CA',
      about: 'Leading technology solutions provider.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject non-string name', async () => {
    const dto = createDto({
      name: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should reject non-string industry', async () => {
    const dto = createDto({
      industry: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('industry');
  });

  it('should reject non-string website', async () => {
    const dto = createDto({
      website: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('website');
  });

  it('should reject non-string headquartersLocation', async () => {
    const dto = createDto({
      headquartersLocation: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('headquartersLocation');
  });

  it('should reject non-string about', async () => {
    const dto = createDto({
      about: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('about');
  });

  it('should reject companyId when non-whitelisted properties are forbidden', async () => {
    const dto = createDto();
    (dto as Record<string, unknown>).companyId = 'company-uuid-1';
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('companyId');
  });

  it('should reject recruiterId when non-whitelisted properties are forbidden', async () => {
    const dto = createDto();
    (dto as Record<string, unknown>).recruiterId = 'recruiter-uuid-1';
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('recruiterId');
  });

  it('should reject userId when non-whitelisted properties are forbidden', async () => {
    const dto = createDto();
    (dto as Record<string, unknown>).userId = 'user-uuid-1';
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('userId');
  });

  it('should not define companyId, recruiterId, or userId on the DTO class', () => {
    const dto = new UpdateCompanyInputDto();
    expect('companyId' in dto).toBe(false);
    expect('recruiterId' in dto).toBe(false);
    expect('userId' in dto).toBe(false);
  });
});
