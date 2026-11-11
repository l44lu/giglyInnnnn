import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkType } from '../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../domain/enums/payment-structure.enum';

export class UpdateJobPostInputDto {
  @IsNotEmpty({ message: 'Category ID is required' })
  @IsString({ message: 'Category ID must be a string' })
  categoryId!: string;

  @IsNotEmpty({ message: 'Job title is required' })
  @IsString({ message: 'Job title must be a string' })
  title!: string;

  @IsNotEmpty({ message: 'Job description is required' })
  @IsString({ message: 'Job description must be a string' })
  description!: string;

  @IsNotEmpty({ message: 'Work type is required' })
  @IsEnum(WorkType, { message: 'Work type must be either remote or local' })
  workType!: WorkType;

  @IsNotEmpty({ message: 'Payment structure is required' })
  @IsEnum(PaymentStructure, {
    message: 'Payment structure must be either fixed or hourly',
  })
  paymentStructure!: PaymentStructure;

  @IsOptional()
  @IsArray({ message: 'skillIds must be an array' })
  @ArrayUnique({ message: 'Duplicate skill IDs are not allowed' })
  @IsUUID('4', { each: true, message: 'Each skill ID must be a valid UUID' })
  skillIds?: string[];

  @ValidateIf((_obj, val) => val !== undefined)
  @IsNotEmpty({ message: 'workersNeeded cannot be empty or null' })
  @IsInt({ message: 'workersNeeded must be an integer' })
  @Min(1, { message: 'workersNeeded must be at least 1' })
  workersNeeded?: number;

  @IsOptional()
  startDate?: Date | string | null;

  @IsOptional()
  @IsString({ message: 'estimatedDuration must be a string' })
  estimatedDuration?: string | null;

  @IsOptional()
  @IsString({ message: 'shiftDuration must be a string' })
  shiftDuration?: string | null;

  @IsOptional()
  @IsString({ message: 'jobLocation must be a string' })
  jobLocation?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'jobLocationLat must be a number' })
  jobLocationLat?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'jobLocationLng must be a number' })
  jobLocationLng?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'budgetAmount must be a number' })
  budgetAmount?: number | null;

  @ValidateIf((_obj, val) => val !== undefined && val !== null)
  @IsNumber({}, { message: 'hourlyRate must be a number' })
  @Min(0.01, { message: 'hourlyRate must be greater than zero' })
  hourlyRate?: number | null;

  constructor(partial?: Partial<UpdateJobPostInputDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
