import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IPasswordResetRepository } from '../../../../domain/repositories/password-reset.repository.interface';
import { IEmailService } from '../../../../domain/services/email.service.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { ForgotPasswordInputDto } from '../../../dto/auth/forgot-password-input.dto';
import { IForgotPasswordUseCase } from '../interface/forgot-password.use-case.interface';

export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_GENERIC_RESPONSE =
  'If an account with that email exists, a password reset code has been sent.';

@Injectable()
export class ForgotPasswordUseCase implements IForgotPasswordUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IPasswordResetRepository)
    private readonly passwordResetRepository: IPasswordResetRepository,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    @Inject(IOtpHashingService)
    private readonly otpHashingService: IOtpHashingService,
  ) {}

  async execute(data: ForgotPasswordInputDto): Promise<{ message: string }> {
    const email = data.email.trim().toLowerCase();

    // 1. Check if user exists (Anti-Enumeration Boundary: never reveal non-existence)
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return { message: PASSWORD_RESET_GENERIC_RESPONSE };
    }

    // 2. Check existing reset requests to enforce persistent 60s cooldown
    const existingReset = await this.passwordResetRepository.findByUserId(
      user.id,
    );

    if (existingReset) {
      const timeSinceLastResetMs =
        Date.now() - existingReset.createdAt.getTime();
      const cooldownMs = PASSWORD_RESET_COOLDOWN_SECONDS * 1000;

      if (timeSinceLastResetMs < cooldownMs) {
        // Anti-Enumeration Boundary: Silently absorb requests during active cooldown.
        // Returning 429 here would leak account presence because non-existent emails return 200.
        // Returning the generic message without generating a new OTP or sending email preserves
        // both the cooldown invariant and the anti-enumeration guarantee.
        return { message: PASSWORD_RESET_GENERIC_RESPONSE };
      }

      // Cooldown elapsed: purge previous reset record before creating a new one
      await this.passwordResetRepository.deleteByUserId(user.id);
    }

    // 3. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 4. Hash OTP with HMAC-SHA256 (plaintext OTP is never persisted)
    const hashedOtp = this.otpHashingService.hashOtp(otp);

    // 5. Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 6. Persist PasswordReset record
    await this.passwordResetRepository.create({
      userId: user.id,
      otpHash: hashedOtp,
      tokenHash: null,
      attempts: 0,
      expiresAt,
    });

    // 7. Dispatch branded reset OTP email
    try {
      await this.emailService.sendPasswordResetOtpEmail(user.email, otp);
    } catch {
      // Clean up orphaned reset record if email dispatch fails
      await this.passwordResetRepository.deleteByUserId(user.id);
      throw new InternalServerErrorException(
        'Failed to send password reset email. Please try again.',
      );
    }

    return { message: PASSWORD_RESET_GENERIC_RESPONSE };
  }
}
