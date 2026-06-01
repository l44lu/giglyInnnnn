import {
  Injectable,
  Inject,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { IEmailService } from '../../../../domain/services/email.service.interface';
import { SendOtpInputDto } from '../../../dto/auth/send-otp-input.dto';
import { ISendOtpUseCase } from '../interface/send-otp.use-case.interface';

@Injectable()
export class SendOtpUseCase implements ISendOtpUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IOtpRepository) private otpRepository: IOtpRepository,
    @Inject(IEmailService) private emailService: IEmailService,
  ) {}

  async execute(data: SendOtpInputDto): Promise<{ message: string }> {
    // check if the user already exists in the main User table
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // hash the password before storing in temp OTP table
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // generate a 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // clear any previous OTP for this email
    await this.otpRepository.deleteByEmail(data.email);

    // store the OTP record with registration data
    await this.otpRepository.create({
      email: data.email,
      otp,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: hashedPassword,
      role: data.role,
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
