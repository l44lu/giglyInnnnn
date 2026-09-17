import { Role } from '../../../domain/enums/role.enum';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: Role;
  firstName!: string;
  lastName!: string;
  createdAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
