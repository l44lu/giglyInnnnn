import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { ResetPasswordInputDto } from '../../../dto/auth/reset-password-input.dto';
import { IResetPasswordUseCase } from '../interface/reset-password.use-case.interface';

@Injectable()
export class ResetPasswordUseCase implements IResetPasswordUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IPasswordResetRepository)
    private readonly passwordResetRepository: IPasswordResetRepository,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(data: ResetPasswordInputDto): Promise<{ message: string }> {
    // 1. Validate that newPassword matches confirmPassword
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    // 2. Hash incoming raw reset authorization token to query PostgreSQL
    const tokenHash = crypto
      .createHash('sha256')
      .update(data.resetToken.trim())
      .digest('hex');

    // 3. Find reset record by authorization token hash
    const resetRecord =
      await this.passwordResetRepository.findByTokenHash(tokenHash);

    if (!resetRecord) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token.',
      );
    }

    // 4. Verify that the reset authorization token has not expired
    if (new Date() > resetRecord.expiresAt) {
      await this.passwordResetRepository.delete(resetRecord.id);
      throw new UnauthorizedException(
        'Password reset token has expired. Please request a new one.',
      );
    }

    // 5. Hash new password with bcrypt (10 rounds, adhering to application standard)
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // 6. Update user's password in database
    await this.userRepository.updatePassword(
      resetRecord.userId,
      hashedPassword,
    );

    // 7. Revoke all active refresh-token sessions across all devices for this user
    await this.refreshTokenRepository.revokeAllForUser(resetRecord.userId);

    // 8. Consume authorization token: permanently delete reset record (single-use)
    await this.passwordResetRepository.delete(resetRecord.id);

    return {
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
