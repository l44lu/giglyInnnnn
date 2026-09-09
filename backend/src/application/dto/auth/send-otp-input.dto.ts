import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export const ALLOWED_REGISTRATION_ROLES = [
  Role.WORKER,
  Role.RECRUITER,
] as const;

export class SendOtpInputDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @IsIn(ALLOWED_REGISTRATION_ROLES, {
    message: 'Role must be either WORKER or RECRUITER',
  })
  @IsOptional()
  role?: Role;
}
