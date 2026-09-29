import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

export interface IDeactivateAdminUserUseCase {
  execute(
    userId: string,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto>;
}

export const IDeactivateAdminUserUseCase = Symbol(
  'IDeactivateAdminUserUseCase',
);
