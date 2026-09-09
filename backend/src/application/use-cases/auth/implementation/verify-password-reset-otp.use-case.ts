import {
  Injectable,
  Inject,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { VerifyResetOtpInputDto } from '../../../dto/auth/verify-reset-otp-input.dto';
import { IVerifyPasswordResetOtpUseCase } from '../interface/verify-password-reset-otp.use-case.interface';

export const MAX_RESET_OTP_ATTEMPTS = 5;

@Injectable()
export class VerifyPasswordResetOtpUseCase implements IVerifyPasswordResetOtpUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IPasswordResetRepository)
    private readonly passwordResetRepository: IPasswordResetRepository,
    @Inject(IOtpHashingService)
    private readonly otpHashingService: IOtpHashingService,
  ) {}

  async execute(
    data: VerifyResetOtpInputDto,
  ): Promise<{ resetToken: string; message: string }> {
    const email = data.email.trim().toLowerCase();

    // 1. Verify that user exists
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset request.',
      );
    }

    // 2. Fetch active reset record for this user
    const resetRecord = await this.passwordResetRepository.findByUserId(
      user.id,
    );

    if (!resetRecord) {
      throw new BadRequestException(
        'Invalid or expired password reset request.',
      );
    }

    // 3. Single-Use Invariant: If a reset token was already issued, this OTP is already consumed
    if (resetRecord.tokenHash !== null) {
      throw new BadRequestException(
        'Invalid or expired password reset request.',
      );
    }

    // 4. Verify that OTP has not expired
    if (new Date() > resetRecord.expiresAt) {
      await this.passwordResetRepository.delete(resetRecord.id);
      throw new GoneException(
        'Password reset code has expired. Please request a new one.',
      );
    }

    // 5. Hash submitted OTP and compare timing-safely with stored HMAC digest
    const submittedOtp = data.otp ?? '';
    const hashedSubmittedOtp = this.otpHashingService.hashOtp(submittedOtp);

    const hashStored = crypto
      .createHash('sha256')
      .update(resetRecord.otpHash)
      .digest();
    const hashSubmitted = crypto
      .createHash('sha256')
      .update(hashedSubmittedOtp)
      .digest();
    const isMatch = crypto.timingSafeEqual(hashStored, hashSubmitted);

    if (!isMatch) {
      const newAttempts = (resetRecord.attempts ?? 0) + 1;

      if (newAttempts >= MAX_RESET_OTP_ATTEMPTS) {
        await this.passwordResetRepository.delete(resetRecord.id);
        throw new BadRequestException(
          'Too many invalid attempts. Please request a new password reset code.',
        );
      }

      await this.passwordResetRepository.updateAttempts(
        resetRecord.id,
        newAttempts,
      );
      throw new BadRequestException(
        'Invalid verification code. Please try again.',
      );
    }

    // 6. OTP verified: Generate single-use, high-entropy 32-byte authorization token
    const rawResetToken = crypto.randomBytes(32).toString('hex');

    // 7. Hash token with SHA-256 before persisting (never store raw authorization token)
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawResetToken)
      .digest('hex');

    // 8. Atomically consume OTP and store tokenHash (Concurrency & Replay Defense)
    // Refresh expiresAt with a fresh 10-minute window for the password entry stage
    const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const consumed =
      await this.passwordResetRepository.consumeOtpAndSetTokenHash(
        resetRecord.id,
        tokenHash,
        resetTokenExpiresAt,
      );

    if (!consumed) {
      throw new BadRequestException(
        'Invalid or expired password reset request.',
      );
    }

    return {
      resetToken: rawResetToken,
      message: 'Verification successful. You may now reset your password.',
    };
  }
}
