import { Injectable, Inject } from '@nestjs/common';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { AdminUserMapper } from '../../../mappers/admin-user-management.mapper';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IListAdminUserUseCase } from '../interface/list-admin-users.use-case.interface';

@Injectable()
export class ListAdminUserUseCase implements IListAdminUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(): Promise<AdminUserResponseDto[]> {
    const user = await this.userRepository.findAll();
    return user.map((user) => AdminUserMapper.toResponseDto(user));
  }
}
