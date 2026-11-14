import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateJobApplicationStatusInputDto {
  @IsOptional()
  @IsString({ message: 'reasonNote must be a string' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(500, { message: 'reasonNote cannot exceed 500 characters' })
  reasonNote?: string;
}
