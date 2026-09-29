import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { AdminUserMapper } from '../../../mappers/admin-user-management.mapper';
import { IDeactivateAdminUserUseCase } from '../interface/deactivate-admin-user.use-case.interface';

@Injectable()
export class DeactivateAdminUserUseCase implements IDeactivateAdminUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(
    userId: string,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    // 1. Mandatory check for authenticated admin identity
    if (!currentAdminId || !currentAdminId.trim()) {
      throw new ForbiddenException('Authenticated admin ID is required');
    }

    // 2. Prevent self-deactivation
    if (currentAdminId === userId) {
      throw new ForbiddenException(
        'Admins cannot deactivate their own account',
      );
    }

    // 3. Look up target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. No-op short-circuit: if already deactivated, return early without mutation or revocation
    if (user.isActive === false) {
      return AdminUserMapper.toResponseDto(user);
    }

    // 5. Soft-delete / deactivate by setting ONLY isActive: false (never hard-delete)
    const updatedUser = await this.userRepository.update(userId, {
      isActive: false,
    });

    // 6. Revoke all active refresh sessions across all devices for the deactivated user
    await this.refreshTokenRepository.revokeAllForUser(userId);

    // 7. Return safe AdminUserResponseDto
    return AdminUserMapper.toResponseDto(updatedUser);
  }
}
