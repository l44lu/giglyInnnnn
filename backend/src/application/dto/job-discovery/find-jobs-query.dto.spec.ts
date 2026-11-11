import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { FindJobsQueryDto } from './find-jobs-query.dto';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';
import { JobSortBy } from '../../../domain/repositories/job-post.repository.interface';

describe('FindJobsQueryDto Validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  const validUUID1 = '123e4567-e89b-42d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-42d3-a456-426614174001';

  describe('Default Values & Clean Instantiation', () => {
    it('sets default page=1, limit=10, sortBy=recent when query is empty', async () => {
      const result = await pipe.transform(
        {},
        { type: 'query', metatype: FindJobsQueryDto },
      );

      expect(result).toBeInstanceOf(FindJobsQueryDto);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe(JobSortBy.RECENT);
    });

    it('preserves constructor defaults on empty instance creation', () => {
      const dto = new FindJobsQueryDto();
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
      expect(dto.sortBy).toBe(JobSortBy.RECENT);
    });
  });

  describe('Valid Query Transformations', () => {
    it('accepts and transforms a fully populated valid query', async () => {
      const rawQuery = {
        search: 'Bartender Event',
        categoryId: validUUID1,
        workType: WorkType.LOCAL,
        location: 'Downtown Chicago',
        paymentStructure: PaymentStructure.HOURLY,
        minPay: '25',
        maxPay: '50',
        skillIds: [validUUID1, validUUID2],
        sortBy: 'pay_high',
        page: '2',
        limit: '25',
      };

      const result = await pipe.transform(rawQuery, {
        type: 'query',
        metatype: FindJobsQueryDto,
      });

      expect(result).toBeInstanceOf(FindJobsQueryDto);
      expect(result.search).toBe('Bartender Event');
      expect(result.categoryId).toBe(validUUID1);
      expect(result.workType).toBe(WorkType.LOCAL);
      expect(result.location).toBe('Downtown Chicago');
      expect(result.paymentStructure).toBe(PaymentStructure.HOURLY);
      expect(result.minPay).toBe(25);
      expect(result.maxPay).toBe(50);
      expect(result.skillIds).toEqual([validUUID1, validUUID2]);
      expect(result.sortBy).toBe(JobSortBy.PAY_HIGH);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('transforms comma-separated skillIds string into trimmed array of UUIDs', async () => {
      const rawQuery = {
        skillIds: `${validUUID1}, ${validUUID2}`,
      };

      const result = await pipe.transform(rawQuery, {
        type: 'query',
        metatype: FindJobsQueryDto,
      });

      expect(result.skillIds).toEqual([validUUID1, validUUID2]);
    });

    it('transforms repeated skillIds query parameters with mixed commas', async () => {
      const rawQuery = {
        skillIds: [validUUID1, `${validUUID2}, ${validUUID1}`],
      };

      const result = await pipe.transform(rawQuery, {
        type: 'query',
        metatype: FindJobsQueryDto,
      });

      expect(result.skillIds).toEqual([validUUID1, validUUID2, validUUID1]);
    });

    it('accepts WorkType.REMOTE', async () => {
      const result = await pipe.transform(
        { workType: WorkType.REMOTE },
        { type: 'query', metatype: FindJobsQueryDto },
      );
      expect(result.workType).toBe(WorkType.REMOTE);
    });

    it('accepts PaymentStructure.FIXED and minPay=0', async () => {
      const result = await pipe.transform(
        { paymentStructure: PaymentStructure.FIXED, minPay: '0' },
        { type: 'query', metatype: FindJobsQueryDto },
      );
      expect(result.paymentStructure).toBe(PaymentStructure.FIXED);
      expect(result.minPay).toBe(0);
    });

    it('accepts JobSortBy.PAY_LOW', async () => {
      const result = await pipe.transform(
        { sortBy: JobSortBy.PAY_LOW },
        { type: 'query', metatype: FindJobsQueryDto },
      );
      expect(result.sortBy).toBe(JobSortBy.PAY_LOW);
    });
  });

  describe('Invalid Query Rejections', () => {
    it('rejects invalid categoryId that is not a UUID', async () => {
      await expect(
        pipe.transform(
          { categoryId: 'non-uuid-string' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid workType enum value', async () => {
      await expect(
        pipe.transform(
          { workType: 'HYBRID' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid paymentStructure enum value', async () => {
      await expect(
        pipe.transform(
          { paymentStructure: 'COMMISSION' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid sortBy enum value', async () => {
      await expect(
        pipe.transform(
          { sortBy: 'alphabetical' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative minPay', async () => {
      await expect(
        pipe.transform(
          { minPay: '-10' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative maxPay', async () => {
      await expect(
        pipe.transform(
          { maxPay: '-1' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-numeric minPay string', async () => {
      await expect(
        pipe.transform(
          { minPay: 'not-a-number' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-UUID skillIds entries', async () => {
      await expect(
        pipe.transform(
          { skillIds: 'valid-not, 1234' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects page < 1', async () => {
      await expect(
        pipe.transform(
          { page: '0' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-integer page', async () => {
      await expect(
        pipe.transform(
          { page: '1.5' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects limit < 1', async () => {
      await expect(
        pipe.transform(
          { limit: '0' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects limit > 50', async () => {
      await expect(
        pipe.transform(
          { limit: '51' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-integer limit', async () => {
      await expect(
        pipe.transform(
          { limit: '10.2' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-whitelisted status field (status is strictly server-enforced)', async () => {
      await expect(
        pipe.transform(
          { status: 'open' },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-whitelisted recruiterId field', async () => {
      await expect(
        pipe.transform(
          { recruiterId: validUUID1 },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-whitelisted workerId field', async () => {
      await expect(
        pipe.transform(
          { workerId: validUUID1 },
          { type: 'query', metatype: FindJobsQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
