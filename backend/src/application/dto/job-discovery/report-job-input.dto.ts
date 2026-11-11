import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportJobInputDto {
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Description is required and cannot be empty' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description!: string;
}
