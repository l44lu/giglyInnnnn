import { validate } from 'class-validator';
import { UpdateRecruiterPersonalProfileInputDto } from './update-recruiter-personal-profile-input.dto';

describe('UpdateRecruiterPersonalProfileInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<UpdateRecruiterPersonalProfileInputDto>,
  ): UpdateRecruiterPersonalProfileInputDto => {
    const dto = new UpdateRecruiterPersonalProfileInputDto();
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

  it('should pass validation when valid strings are provided', async () => {
    const dto = createDto({
      firstName: 'Alex',
      lastName: 'Smith',
      phone: '+14155552671',
      location: 'San Francisco, CA',
      bio: 'Technical Recruiter at Acme Corp.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject non-string firstName', async () => {
    const dto = createDto({
      firstName: 12345 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('firstName');
  });

  it('should reject non-string lastName', async () => {
    const dto = createDto({
      lastName: true as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('lastName');
  });

  it('should reject non-string phone if not null', async () => {
    const dto = createDto({
      phone: 987654 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phone');
  });

  it('should reject non-string location if not null', async () => {
    const dto = createDto({
      location: 987654 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('location');
  });

  it('should reject non-string bio if not null', async () => {
    const dto = createDto({
      bio: 987654 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('bio');
  });
});
