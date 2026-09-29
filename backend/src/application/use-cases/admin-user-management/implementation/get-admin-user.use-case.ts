import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { AdminUserMapper } from '../../../mappers/admin-user-management.mapper';
import { IGetAdminUserUseCase } from '../interface/get-admin-user.use-case.interface';

@Injectable()
export class GetAdminUserUseCase implements IGetAdminUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<AdminUserResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return AdminUserMapper.toResponseDto(user);
  }
}
