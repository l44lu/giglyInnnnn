import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ApplyJobInputDto } from './apply-job-input.dto';

describe('ApplyJobInputDto Validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  it('accepts an empty payload when optional fields are omitted', async () => {
    const result = await pipe.transform(
      {},
      { type: 'body', metatype: ApplyJobInputDto },
    );
    expect(result).toBeInstanceOf(ApplyJobInputDto);
    expect(result.expectedPay).toBeUndefined();
    expect(result.availableDate).toBeUndefined();
  });

  it('accepts null for optional fields', async () => {
    const result = await pipe.transform(
      { expectedPay: null, availableDate: null },
      { type: 'body', metatype: ApplyJobInputDto },
    );
    expect(result).toBeInstanceOf(ApplyJobInputDto);
    expect(result.expectedPay).toBeNull();
    expect(result.availableDate).toBeNull();
  });

  it('accepts valid expectedPay and future availableDate', async () => {
    const result = await pipe.transform(
      { expectedPay: 125.5, availableDate: '2099-06-15' },
      { type: 'body', metatype: ApplyJobInputDto },
    );
    expect(result).toBeInstanceOf(ApplyJobInputDto);
    expect(result.expectedPay).toBe(125.5);
    expect(result.availableDate).toBe('2099-06-15');
  });

  it('accepts today as availableDate', async () => {
    const now = new Date();
    const today = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('-');

    const result = await pipe.transform(
      { availableDate: today },
      { type: 'body', metatype: ApplyJobInputDto },
    );
    expect(result.availableDate).toBe(today);
  });

  describe('expectedPay validation', () => {
    it('rejects expectedPay of 0', async () => {
      await expect(
        pipe.transform(
          { expectedPay: 0 },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative expectedPay', async () => {
      await expect(
        pipe.transform(
          { expectedPay: -25 },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expectedPay with more than 2 decimal places', async () => {
      await expect(
        pipe.transform(
          { expectedPay: 10.999 },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expectedPay greater than 99999999.99', async () => {
      await expect(
        pipe.transform(
          { expectedPay: 100000000 },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('availableDate validation', () => {
    it('rejects invalid date format', async () => {
      await expect(
        pipe.transform(
          { availableDate: '2099/12/31' },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects past date', async () => {
      await expect(
        pipe.transform(
          { availableDate: '2020-01-01' },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid calendar date such as Feb 31', async () => {
      await expect(
        pipe.transform(
          { availableDate: '2099-02-31' },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    describe('timezone-aware calendar date validation', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      it('accepts local today in a negative UTC offset (UTC-8) when UTC is already next day', async () => {
        // 2026-11-12 04:00 UTC === 2026-11-11 20:00 in UTC-8 (offset +480)
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-11-12T04:00:00.000Z'));

        const result = await pipe.transform(
          { availableDate: '2026-11-11', timezoneOffsetMinutes: 480 },
          { type: 'body', metatype: ApplyJobInputDto },
        );
        expect(result.availableDate).toBe('2026-11-11');
        expect(result.timezoneOffsetMinutes).toBe(480);

        // Local yesterday in UTC-8 (2026-11-10) is still rejected
        await expect(
          pipe.transform(
            { availableDate: '2026-11-10', timezoneOffsetMinutes: 480 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects UTC today when worker is in a positive UTC offset (UTC+9) where it is already tomorrow', async () => {
        // 2026-11-12 20:00 UTC === 2026-11-13 05:00 in UTC+9 (offset -540)
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-11-12T20:00:00.000Z'));

        // Local today (2026-11-13) and future accepted
        const accepted = await pipe.transform(
          { availableDate: '2026-11-13', timezoneOffsetMinutes: -540 },
          { type: 'body', metatype: ApplyJobInputDto },
        );
        expect(accepted.availableDate).toBe('2026-11-13');

        // Local yesterday (2026-11-12, even though still today in UTC) is rejected
        await expect(
          pipe.transform(
            { availableDate: '2026-11-12', timezoneOffsetMinutes: -540 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('handles UTC timezone (offset 0) and exact midnight date boundary', async () => {
        // 1ms before UTC-5 midnight: 2026-11-12 04:59:59.999Z === 2026-11-11 23:59:59.999 in UTC-5 (offset +300)
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-11-12T04:59:59.999Z'));
        const beforeMidnight = await pipe.transform(
          { availableDate: '2026-11-11', timezoneOffsetMinutes: 300 },
          { type: 'body', metatype: ApplyJobInputDto },
        );
        expect(beforeMidnight.availableDate).toBe('2026-11-11');

        // Exactly at UTC-5 midnight: 2026-11-12 05:00:00.000Z === 2026-11-12 00:00:00 in UTC-5
        jest.setSystemTime(new Date('2026-11-12T05:00:00.000Z'));
        await expect(
          pipe.transform(
            { availableDate: '2026-11-11', timezoneOffsetMinutes: 300 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);

        const atMidnight = await pipe.transform(
          { availableDate: '2026-11-12', timezoneOffsetMinutes: 0 },
          { type: 'body', metatype: ApplyJobInputDto },
        );
        expect(atMidnight.availableDate).toBe('2026-11-12');
      });

      it('rejects out-of-range or non-integer timezoneOffsetMinutes to prevent past-date bypass', async () => {
        await expect(
          pipe.transform(
            { availableDate: '2026-11-10', timezoneOffsetMinutes: 1440 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          pipe.transform(
            { availableDate: '2099-01-01', timezoneOffsetMinutes: -841 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          pipe.transform(
            { availableDate: '2099-01-01', timezoneOffsetMinutes: 30.5 },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          pipe.transform(
            {
              availableDate: '2099-01-01',
              timezoneOffsetMinutes: '480' as any,
            },
            { type: 'body', metatype: ApplyJobInputDto },
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('forbidden non-whitelisted fields', () => {
    it('rejects client-provided workerId', async () => {
      await expect(
        pipe.transform(
          { workerId: 'malicious-worker-id' },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects client-provided status', async () => {
      await expect(
        pipe.transform(
          { status: 'accepted' },
          { type: 'body', metatype: ApplyJobInputDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
