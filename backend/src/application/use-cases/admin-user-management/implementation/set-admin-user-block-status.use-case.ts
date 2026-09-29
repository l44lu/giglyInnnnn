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
import { ISetAdminUserBlockStatusUseCase } from '../interface/set-admin-user-block-status.use-case.interface';

@Injectable()
export class SetAdminUserBlockStatusUseCase implements ISetAdminUserBlockStatusUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(
    userId: string,
    isBlocked: boolean,
    currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    // 1. Enforce that authenticated admin ID is present and prevent self-blocking
    if (!currentAdminId || !currentAdminId.trim()) {
      throw new ForbiddenException('Authenticated admin ID is required');
    }

    if (currentAdminId === userId && isBlocked) {
      throw new ForbiddenException('Admins cannot block their own account');
    }

    // 2. Find target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. No-op check: if user already has the requested isBlocked status, return unchanged
    if (user.isBlocked === isBlocked) {
      return AdminUserMapper.toResponseDto(user);
    }

    // 4. Persist ONLY the isBlocked change
    const updatedUser = await this.userRepository.update(userId, {
      isBlocked,
    });

    // 5. When blocking a user, revoke all active refresh tokens across all devices
    if (isBlocked) {
      await this.refreshTokenRepository.revokeAllForUser(userId);
    }

    // 6. Map to safe AdminUserResponseDto
    return AdminUserMapper.toResponseDto(updatedUser);
  }
}
