import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

export interface ISetAdminUserBlockStatusUseCase {
  execute(
    userId: string,
    isBlocked: boolean,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto>;
}

export const ISetAdminUserBlockStatusUseCase = Symbol(
  'ISetAdminUserBlockStatusUseCase',
);
