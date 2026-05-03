import { Role } from '@prisma/client';

export class RegisterInputDto {
  password!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  role?: Role;
}
