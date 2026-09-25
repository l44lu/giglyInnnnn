import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { ChangePasswordInputDto } from '../../../dto/auth/change-password-input.dto';
import { IChangePasswordUseCase } from '../interface/change-password.use-case.interface';

@Injectable()
export class ChangePasswordUseCase implements IChangePasswordUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    data: ChangePasswordInputDto,
  ): Promise<{ message: string }> {
    // 1. Load user by authenticated ID
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Status check: user must be active and not blocked
    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('User account is inactive or blocked');
    }

    // 3. Validate inputs
    if (!data.currentPassword || typeof data.currentPassword !== 'string') {
      throw new BadRequestException('Current password is required');
    }

    if (
      !data.newPassword ||
      typeof data.newPassword !== 'string' ||
      data.newPassword.length < 8
    ) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    // 4. Verify current password against stored hash
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passWordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // 5. Hash new password with bcrypt (10 salt rounds application standard)
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // 6. Persist the new password hash via IUserRepository
    await this.userRepository.updatePassword(user.id, hashedPassword);

    return {
      message: 'Password changed successfully',
    };
  }
}
