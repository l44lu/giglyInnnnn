import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../../domain/enums/role.enum';

export class ChangeAdminUserRoleInputDto {
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(Role, {
    message:
      'Role must be one of the following values: ADMIN, WORKER, RECRUITER',
  })
  role!: Role;

  constructor(partial?: Partial<ChangeAdminUserRoleInputDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
