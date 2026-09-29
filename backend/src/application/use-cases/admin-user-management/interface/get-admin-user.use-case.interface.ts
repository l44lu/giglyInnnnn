import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

export interface IGetAdminUserUseCase {
  execute(userId: string): Promise<AdminUserResponseDto>;
}

export const IGetAdminUserUseCase = Symbol('IGetAdminUserUseCase');
