import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import {
  ITokenService,
  InvalidTokenError,
  RefreshTokenPayload,
} from '../../../../domain/services/token.service.interface';
import { RefreshInputDto } from '../../../dto/auth/refresh-input.dto';
import { RefreshResponseDto } from '../../../dto/auth/refresh-response.dto';
import { IRefreshUseCase } from '../interface/refresh.use-case.interface';

@Injectable()
export class RefreshUseCase implements IRefreshUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(IRefreshTokenHashingService)
    private readonly refreshTokenHashingService: IRefreshTokenHashingService,
    @Inject(ITokenService)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(data: RefreshInputDto): Promise<RefreshResponseDto> {
    if (!data.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // 1. Verify the refresh JWT cryptographically through ITokenService
    let payload: RefreshTokenPayload;
    try {
      payload = await this.tokenService.verifyRefreshToken(data.refresh_token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }
      throw error;
    }

    // 2. Compute deterministic hash of incoming raw refresh token for database lookup
    const tokenHash = this.refreshTokenHashingService.hash(data.refresh_token);

    // 3. Check if the token hash exists in the database
    const savedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!savedToken) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // 4. Refresh Token Reuse Detection (9C-4):
    // If the token was already consumed/revoked, revoke the entire session
    if (savedToken.revokedAt != null) {
      await this.refreshTokenRepository.revokeSession(
        savedToken.sessionId,
        'REUSE_DETECTED',
      );
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    if (savedToken.expiresAt && savedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // 5. Load the live user and verify that the account can authenticate
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Account status check (9.4): User must be active and not blocked
    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // 6. Issue replacement access token through ITokenService
    const access_token = await this.tokenService.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // 7. Issue replacement refresh token through ITokenService
    const refreshTokenResult = await this.tokenService.issueRefreshToken({
      sub: user.id,
    });

    // 8. Compute hash of replacement refresh token
    const newTokenHash = this.refreshTokenHashingService.hash(
      refreshTokenResult.token,
    );

    // 9. Atomically mark old refresh token as revoked (ROTATED) and persist replacement token within the same session
    const rotated = await this.refreshTokenRepository.rotate(
      tokenHash,
      {
        tokenHash: newTokenHash,
        userId: user.id,
        expiresAt: refreshTokenResult.expiresAt,
        sessionId: savedToken.sessionId,
      },
      'ROTATED',
    );

    // 10. If rotation fails because the old token was already consumed (concurrent race), revoke compromised session
    if (!rotated) {
      await this.refreshTokenRepository.revokeSession(
        savedToken.sessionId,
        'REUSE_DETECTED',
      );
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    return {
      access_token,
      refresh_token: refreshTokenResult.token,
    };
  }
}
