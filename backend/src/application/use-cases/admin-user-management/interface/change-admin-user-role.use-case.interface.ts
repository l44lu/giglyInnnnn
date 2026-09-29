import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { ChangeAdminUserRoleInputDto } from '../../../dto/admin-user-management/change-admin-user-role-input.dto';

export interface IChangeAdminUserRoleUseCase {
  execute(
    userId: string,
    data: ChangeAdminUserRoleInputDto,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto>;
}

export const IChangeAdminUserRoleUseCase = Symbol(
  'IChangeAdminUserRoleUseCase',
);
