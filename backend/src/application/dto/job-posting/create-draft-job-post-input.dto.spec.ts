import { validate } from 'class-validator';
import { CreateDraftJobPostInputDto } from './create-draft-job-post-input.dto';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';

describe('CreateDraftJobPostInputDto Validation', () => {
  const createValidDto = (
    overrides?: Partial<CreateDraftJobPostInputDto>,
  ): CreateDraftJobPostInputDto => {
    const dto = new CreateDraftJobPostInputDto({
      categoryId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Short-order Cook Needed',
      description: 'Need experienced cook for weekend shifts in busy cafe.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      skillIds: ['123e4567-e89b-42d3-a456-426614174001'],
      workersNeeded: 2,
      hourlyRate: 25,
      jobLocation: 'Austin, TX',
      ...overrides,
    });
    return dto;
  };

  it('should pass validation when all valid required and optional fields are provided', async () => {
    const dto = createValidDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with minimal required fields', async () => {
    const dto = new CreateDraftJobPostInputDto({
      categoryId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Warehouse Helper',
      description: 'Loading and packing orders.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.FIXED,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject missing categoryId', async () => {
    const dto = createValidDto({ categoryId: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
  });

  it('should reject missing title', async () => {
    const dto = createValidDto({ title: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject missing description', async () => {
    const dto = createValidDto({ description: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('should reject invalid workType', async () => {
    const dto = createValidDto({
      workType: 'INVALID_WORK_TYPE' as unknown as WorkType,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workType')).toBe(true);
  });

  it('should reject invalid paymentStructure', async () => {
    const dto = createValidDto({
      paymentStructure: 'INVALID_PAYMENT' as unknown as PaymentStructure,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'paymentStructure')).toBe(true);
  });

  it('should reject non-UUID skill IDs', async () => {
    const dto = createValidDto({ skillIds: ['invalid-not-uuid'] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'skillIds')).toBe(true);
  });

  it('should reject workersNeeded less than 1', async () => {
    const dto = createValidDto({ workersNeeded: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workersNeeded')).toBe(true);
  });

  it('should accept workersNeeded = 1 and workersNeeded = 5', async () => {
    const dto1 = createValidDto({ workersNeeded: 1 });
    const errors1 = await validate(dto1);
    expect(errors1.length).toBe(0);

    const dto5 = createValidDto({ workersNeeded: 5 });
    const errors5 = await validate(dto5);
    expect(errors5.length).toBe(0);
  });

  it('should reject negative workersNeeded', async () => {
    const dto = createValidDto({ workersNeeded: -3 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workersNeeded')).toBe(true);
  });

  it('should reject decimal workersNeeded', async () => {
    const dto = createValidDto({ workersNeeded: 2.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workersNeeded')).toBe(true);
  });

  it('should reject explicitly null workersNeeded', async () => {
    const dto = createValidDto({ workersNeeded: null as unknown as number });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workersNeeded')).toBe(true);
  });

  it('should accept omitted workersNeeded (undefined)', async () => {
    const dto = createValidDto();
    delete dto.workersNeeded;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid positive hourlyRate and reject 0 or negative', async () => {
    const dtoValid = createValidDto({ hourlyRate: 35.5 });
    const errorsValid = await validate(dtoValid);
    expect(errorsValid.length).toBe(0);

    const dtoZero = createValidDto({ hourlyRate: 0 });
    const errorsZero = await validate(dtoZero);
    expect(errorsZero.length).toBeGreaterThan(0);
    expect(errorsZero.some((e) => e.property === 'hourlyRate')).toBe(true);

    const dtoNegative = createValidDto({ hourlyRate: -10 });
    const errorsNegative = await validate(dtoNegative);
    expect(errorsNegative.length).toBeGreaterThan(0);
    expect(errorsNegative.some((e) => e.property === 'hourlyRate')).toBe(true);
  });

  it('should not define recruiterId or userId on the DTO class', () => {
    const dto = new CreateDraftJobPostInputDto();
    expect('recruiterId' in dto).toBe(false);
    expect('userId' in dto).toBe(false);
  });

  it('should reject recruiterId when non-whitelisted properties are forbidden', async () => {
    const dto = createValidDto();
    (dto as unknown as Record<string, unknown>).recruiterId =
      'recruiter-profile-uuid';
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'recruiterId')).toBe(true);
  });
});
