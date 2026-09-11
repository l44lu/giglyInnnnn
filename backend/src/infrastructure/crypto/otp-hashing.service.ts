import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IOtpHashingService } from '../../domain/services/otp-hashing.service.interface';

@Injectable()
export class OtpHashingService implements IOtpHashingService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('OTP_HASH_SECRET');

    if (
      !secret ||
      secret.trim() === '' ||
      secret === 'secret' ||
      secret === 'development-secret'
    ) {
      throw new Error(
        'OTP_HASH_SECRET environment variable is missing, empty, or set to an insecure default value.',
      );
    }

    this.secret = secret;
  }

  hashOtp(otp: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(otp ?? '')
      .digest('hex');
  }
}
