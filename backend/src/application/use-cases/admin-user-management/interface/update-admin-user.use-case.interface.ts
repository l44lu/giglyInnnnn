import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { UpdateAdminUserInputDto } from '../../../dto/admin-user-management/update-admin-user-input.dto';

export interface IUpdateAdminUserUseCase {
  execute(
    userId: string,
    data: UpdateAdminUserInputDto,
  ): Promise<AdminUserResponseDto>;
}

export const IUpdateAdminUserUseCase = Symbol('IUpdateAdminUserUseCase');
