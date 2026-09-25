import { Role } from '../../../domain/enums/role.enum';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: Role;
  firstName!: string;
  lastName!: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
