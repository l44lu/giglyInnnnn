import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { ChangeAdminUserRoleInputDto } from '../../../dto/admin-user-management/change-admin-user-role-input.dto';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { AdminUserMapper } from '../../../mappers/admin-user-management.mapper';
import { IChangeAdminUserRoleUseCase } from '../interface/change-admin-user-role.use-case.interface';

@Injectable()
export class ChangeAdminUserRoleUseCase implements IChangeAdminUserRoleUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    data: ChangeAdminUserRoleInputDto,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    // Prevent self-role changes
    if (currentAdminId === userId) {
      throw new ForbiddenException('Admins cannot change their own role');
    }

    // Find the target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // No-op check: if user already has the requested role, return unchanged without updating repository
    if (user.role === data.role) {
      return AdminUserMapper.toResponseDto(user);
    }

    // Persist ONLY the role change
    const updatedUser = await this.userRepository.update(userId, {
      role: data.role,
    });

    // Map to response DTO
    return AdminUserMapper.toResponseDto(updatedUser);
  }
}
