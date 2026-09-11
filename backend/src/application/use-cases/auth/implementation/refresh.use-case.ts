import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RefreshInputDto } from '../../../dto/auth/refresh-input.dto';
import { RefreshResponseDto } from '../../../dto/auth/refresh-response.dto';

import { IRefreshUseCase } from '../interface/refresh.use-case.interface';

@Injectable()
export class RefreshUseCase implements IRefreshUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private refreshTokenRepository: IRefreshTokenRepository,
    @Inject(IRefreshTokenHashingService)
    private refreshTokenHashingService: IRefreshTokenHashingService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(data: RefreshInputDto): Promise<RefreshResponseDto> {
    if (!data.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: { sub: string };
    try {
      // verifying the refresh token signature and expiration
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        data.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new UnauthorizedException('Invalid refresh token', errorMessage);
    }

    // Compute deterministic hash of incoming raw refresh token for database lookup
    const tokenHash = this.refreshTokenHashingService.hash(data.refresh_token);

    // Check if the token hash exists in the database
    const savedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!savedToken) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Refresh Token Reuse Detection (9C-4):
    // If the token was already consumed/revoked, revoke the entire token family
    if (savedToken.revokedAt != null) {
      await this.refreshTokenRepository.revokeFamily(savedToken.familyId);
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    if (savedToken.expiresAt && savedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Account status check (9.4): User must be active and not blocked
    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // section for generating new access token
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(newPayload);

    // generate replacement refresh token
    const new_refresh_token = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as JwtSignOptions['expiresIn'],
        jwtid: crypto.randomUUID(),
      },
    );

    // compute hash of replacement refresh token
    const newTokenHash =
      this.refreshTokenHashingService.hash(new_refresh_token);

    const expiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Atomically mark old refresh token as revoked and persist replacement token within the same family
    const rotated = await this.refreshTokenRepository.rotate(tokenHash, {
      token: newTokenHash,
      userId: user.id,
      expiresAt,
      familyId: savedToken.familyId,
    });

    if (!rotated) {
      await this.refreshTokenRepository.revokeFamily(savedToken.familyId);
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    return {
      access_token,
      refresh_token: new_refresh_token,
    };
  }
}
