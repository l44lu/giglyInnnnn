import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateAdminUserInputDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;

  constructor(partial?: Partial<UpdateAdminUserInputDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
