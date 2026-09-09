import {
  Injectable,
  Inject,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { VerifyOtpInputDto } from '../../../dto/auth/verify-otp-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { IVerifyOtpAndRegisterUseCase } from '../interface/verify-otp-register.use-case.interface';

export const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class VerifyOtpAndRegisterUseCase implements IVerifyOtpAndRegisterUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IOtpRepository) private otpRepository: IOtpRepository,
    @Inject(IOtpHashingService) private otpHashingService: IOtpHashingService,
  ) {}

  async execute(data: VerifyOtpInputDto): Promise<UserResponseDto> {
    // find the OTP record for this email
    const otpRecord = await this.otpRepository.findByEmail(data.email);

    if (!otpRecord) {
      throw new BadRequestException(
        'No OTP found for this email. Please request a new one.',
      );
    }

    // check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await this.otpRepository.deleteByEmail(data.email);
      throw new GoneException('OTP has expired. Please request a new one.');
    }

    // hash submitted OTP and compare timing-safely with stored HMAC digest
    const submittedOtp = data.otp ?? '';
    const hashedSubmittedOtp = this.otpHashingService.hashOtp(submittedOtp);

    const hashStored = crypto
      .createHash('sha256')
      .update(otpRecord.otp)
      .digest();
    const hashSubmitted = crypto
      .createHash('sha256')
      .update(hashedSubmittedOtp)
      .digest();
    const isMatch = crypto.timingSafeEqual(hashStored, hashSubmitted);

    if (!isMatch) {
      const newAttempts = (otpRecord.attempts ?? 0) + 1;

      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        await this.otpRepository.deleteByEmail(data.email);
        throw new BadRequestException(
          'Too many invalid attempts. Please request a new OTP.',
        );
      }

      await this.otpRepository.updateAttempts(data.email, newAttempts);
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // OTP verified — create the user in the main User table
    const user = await this.userRepository.create({
      email: otpRecord.email,
      passWordHash: otpRecord.passwordHash,
      firstName: otpRecord.firstName,
      lastName: otpRecord.lastName,
      role: otpRecord.role,
    });

    // clean up the OTP record
    await this.otpRepository.deleteByEmail(data.email);

    return UserMapper.toResponseDto(user);
  }
}
