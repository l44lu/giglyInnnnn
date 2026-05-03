import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface RefreshInput {
  refresh_token: string;
}

@Injectable()
export class RefreshUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private refreshTokenRepository: IRefreshTokenRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(data: RefreshInput) {
    if (!data.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // verifing the refresh token signature and expiration
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        data.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      // this section check if the token exists in the database or not
      const savedToken = await this.refreshTokenRepository.findByToken(
        data.refresh_token,
      );

      if (!savedToken) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // finding the user
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // section for generating new access token
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const access_token = await this.jwtService.signAsync(newPayload);

      // (optional) refresh token rotation could be added here but may add if neccessary not decided btw !!!!!!!!

      return {
        access_token,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new UnauthorizedException('Invalid refresh token', errorMessage);
    }
  }
}
