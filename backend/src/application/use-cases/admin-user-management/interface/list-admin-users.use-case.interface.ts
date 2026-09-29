import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';

export interface IListAdminUserUseCase {
  execute(): Promise<AdminUserResponseDto[]>;
}

export const IListAdminUserUseCase = Symbol('IListAdminUserUseCase');
