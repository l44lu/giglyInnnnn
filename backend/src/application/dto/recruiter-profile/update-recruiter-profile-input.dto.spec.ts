import { validate } from 'class-validator';
import { UpdateRecruiterProfileInputDto } from './update-recruiter-profile-input.dto';

describe('UpdateRecruiterProfileInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<UpdateRecruiterProfileInputDto>,
  ): UpdateRecruiterProfileInputDto => {
    const dto = new UpdateRecruiterProfileInputDto();
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
      roleTitle: 'Technical Recruiter',
      yearsExperience: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject negative yearsExperience', async () => {
    const dto = createDto({
      yearsExperience: -1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('yearsExperience');
  });

  it('should reject non-integer yearsExperience', async () => {
    const dto = createDto({
      yearsExperience: 3.5 as unknown as number,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('yearsExperience');
  });

  it('should reject non-string roleTitle', async () => {
    const dto = createDto({
      roleTitle: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('roleTitle');
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

  it('should not define companyId on the DTO class', () => {
    const dto = new UpdateRecruiterProfileInputDto();
    expect('companyId' in dto).toBe(false);
  });
});
