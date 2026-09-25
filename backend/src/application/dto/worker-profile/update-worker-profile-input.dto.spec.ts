import { validate } from 'class-validator';
import { UpdateWorkerProfileInputDto } from './update-worker-profile-input.dto';

describe('UpdateWorkerProfileInputDto Validation', () => {
  const createDto = (
    overrides?: Partial<UpdateWorkerProfileInputDto>,
  ): UpdateWorkerProfileInputDto => {
    const dto = new UpdateWorkerProfileInputDto();
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
      headline: 'Full Stack Engineer',
      yearsExperience: 5,
      responseTimeHours: 2,
      availabilityStatus: 'available',
      isOpenToWork: true,
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

  it('should reject negative responseTimeHours', async () => {
    const dto = createDto({
      responseTimeHours: -2,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('responseTimeHours');
  });

  it('should reject non-boolean isOpenToWork', async () => {
    const dto = createDto({
      isOpenToWork: 'yes' as unknown as boolean,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('isOpenToWork');
  });
});
