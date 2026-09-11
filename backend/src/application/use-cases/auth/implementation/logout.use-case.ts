import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { LogoutInputDto } from '../../../dto/auth/logout-input.dto';
import { ILogoutUseCase } from '../interface/logout.use-case.interface';

@Injectable()
export class LogoutUseCase implements ILogoutUseCase {
  constructor(
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(IRefreshTokenHashingService)
    private readonly refreshTokenHashingService: IRefreshTokenHashingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    userId: string,
    data: LogoutInputDto,
  ): Promise<{ message: string }> {
    if (
      !data ||
      !data.refresh_token ||
      typeof data.refresh_token !== 'string' ||
      !data.refresh_token.trim()
    ) {
      throw new BadRequestException('Refresh token is required');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        data.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Hash the raw refresh token immediately (never persist or log raw tokens)
    const tokenHash = this.refreshTokenHashingService.hash(data.refresh_token);

    // Look up the refresh token record in PostgreSQL
    const savedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!savedToken) {
      // Unknown refresh token: reject without altering any token families
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Verify token ownership matches the authenticated caller
    if (savedToken.userId !== userId || payload.sub !== userId) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Check expiration
    if (savedToken.expiresAt && savedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Revoke the entire refresh-token family
    await this.refreshTokenRepository.revokeFamily(savedToken.familyId);

    return {
      message: 'Logged out successfully',
    };
  }
}
