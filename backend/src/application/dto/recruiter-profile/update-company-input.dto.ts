import { IsOptional, IsString } from 'class-validator';

export class UpdateCompanyInputDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  industry?: string | null;

  @IsOptional()
  @IsString()
  companySize?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  headquartersLocation?: string | null;

  @IsOptional()
  @IsString()
  about?: string | null;
}
