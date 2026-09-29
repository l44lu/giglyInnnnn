import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRecruiterProfileInputDto {
  @IsOptional()
  @IsString()
  roleTitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number | null;
}
