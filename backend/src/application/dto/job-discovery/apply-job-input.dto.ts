import {
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';

export const MIN_TIMEZONE_OFFSET_MINUTES = -840; // UTC+14:00
export const MAX_TIMEZONE_OFFSET_MINUTES = 720; // UTC-12:00

export function isValidTimezoneOffsetMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_TIMEZONE_OFFSET_MINUTES &&
    value <= MAX_TIMEZONE_OFFSET_MINUTES
  );
}

/**
 * Parses a strict YYYY-MM-DD calendar date string into a UTC-midnight Date.
 * Returns null if the format or calendar date (e.g. Feb 30) is invalid.
 */
export function parseCalendarDateString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Computes "today" as a UTC-midnight Date in the client's calendar timezone.
 * Matches JS Date.prototype.getTimezoneOffset() semantics (UTC - local, in minutes).
 */
export function getTodayDateUtcForOffset(
  timezoneOffsetMinutes = 0,
  now: Date = new Date(),
): Date {
  const shifted = new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

@ValidatorConstraint({ name: 'isCalendarDatePresentOrFuture', async: false })
export class IsCalendarDatePresentOrFutureConstraint implements ValidatorConstraintInterface {
  validate(value: any, args?: ValidationArguments): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;

    const date = parseCalendarDateString(value);
    if (!date) return false;

    const rawOffset = (args?.object as ApplyJobInputDto | undefined)
      ?.timezoneOffsetMinutes;
    if (rawOffset !== undefined && rawOffset !== null) {
      if (!isValidTimezoneOffsetMinutes(rawOffset)) {
        // Defer invalid offset rejection to timezoneOffsetMinutes field validators
        return true;
      }
    }

    const todayForClient = getTodayDateUtcForOffset(rawOffset ?? 0);
    return date >= todayForClient;
  }

  defaultMessage(): string {
    return 'availableDate must be a valid calendar date in YYYY-MM-DD format and cannot be in the past';
  }
}

export class ApplyJobInputDto {
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'expectedPay must be a number with at most 2 decimal places' },
  )
  @Min(0.01, { message: 'expectedPay must be greater than 0' })
  @Max(99999999.99, { message: 'expectedPay cannot exceed 99999999.99' })
  expectedPay?: number | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @Validate(IsCalendarDatePresentOrFutureConstraint)
  availableDate?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsInt({ message: 'timezoneOffsetMinutes must be an integer' })
  @Min(MIN_TIMEZONE_OFFSET_MINUTES, {
    message: `timezoneOffsetMinutes cannot be less than ${MIN_TIMEZONE_OFFSET_MINUTES}`,
  })
  @Max(MAX_TIMEZONE_OFFSET_MINUTES, {
    message: `timezoneOffsetMinutes cannot exceed ${MAX_TIMEZONE_OFFSET_MINUTES}`,
  })
  timezoneOffsetMinutes?: number | null;
}
