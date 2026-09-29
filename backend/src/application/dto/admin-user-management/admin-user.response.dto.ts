import { Role } from '../../../domain/enums/role.enum';

export class AdminUserResponseDto {
  id!: string;
  email!: string;
  role!: Role;
  firstName!: string;
  lastName!: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  isActive!: boolean;
  isBlocked!: boolean;
  createdAt!: Date;

  constructor(partial: Partial<AdminUserResponseDto>) {
    Object.assign(this, partial);
  }
}
