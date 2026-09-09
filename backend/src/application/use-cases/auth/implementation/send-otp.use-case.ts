import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { IEmailService } from '../../../../domain/services/email.service.interface';
import { IOtpHashingService } from '../../../../domain/services/otp-hashing.service.interface';
import { SendOtpInputDto } from '../../../dto/auth/send-otp-input.dto';
import { ISendOtpUseCase } from '../interface/send-otp.use-case.interface';

export const OTP_SEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class SendOtpUseCase implements ISendOtpUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IOtpRepository) private otpRepository: IOtpRepository,
    @Inject(IEmailService) private emailService: IEmailService,
    @Inject(IOtpHashingService) private otpHashingService: IOtpHashingService,
  ) {}

  async execute(data: SendOtpInputDto): Promise<{ message: string }> {
    // 0. Reject any attempt to self-assign the ADMIN role (Privilege Escalation Defense)
    if (data.role === Role.ADMIN) {
      throw new BadRequestException(
        'ADMIN role cannot be self-assigned through public registration.',
      );
    }

    // check if the user already exists in the main User table
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // check if an OTP already exists for this email and enforce persistent cooldown
    const existingOtp = await this.otpRepository.findByEmail(data.email);
    if (existingOtp) {
      const timeSinceLastOtpMs = Date.now() - existingOtp.createdAt.getTime();
      const cooldownMs = OTP_SEND_COOLDOWN_SECONDS * 1000;

      if (timeSinceLastOtpMs < cooldownMs) {
        throw new HttpException(
          'Please wait before requesting another OTP.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // cooldown has passed: remove previous OTP record before creating the new one
      await this.otpRepository.deleteByEmail(data.email);
    }

    // hash the password before storing in temp OTP table
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // generate a 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // hash the OTP before storing in the database
    const hashedOtp = this.otpHashingService.hashOtp(otp);

    // set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // store the OTP record with registration data (persisting ONLY hashed OTP)
    await this.otpRepository.create({
      email: data.email,
      otp: hashedOtp,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: hashedPassword,
      role: data.role,
      attempts: 0,
      expiresAt,
    });

    // send OTP email
    try {
      await this.emailService.sendOtpEmail(data.email, otp);
    } catch {
      // clean up the OTP record if email sending fails
      await this.otpRepository.deleteByEmail(data.email);
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again.',
      );
    }

    return { message: 'OTP sent successfully to your email' };
  }
}
