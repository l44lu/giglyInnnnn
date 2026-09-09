import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IRefreshTokenHashingService } from '../../domain/services/refresh-token-hashing.service.interface';

@Injectable()
export class RefreshTokenHashingService implements IRefreshTokenHashingService {
  hash(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token ?? '')
      .digest('hex');
  }
}
