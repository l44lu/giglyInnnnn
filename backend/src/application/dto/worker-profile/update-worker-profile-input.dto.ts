import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWorkerProfileInputDto {
  @IsOptional()
  @IsString()
  headline?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  responseTimeHours?: number | null;

  @IsOptional()
  @IsString()
  availabilityStatus?: string;

  @IsOptional()
  @IsBoolean()
  isOpenToWork?: boolean;
}
